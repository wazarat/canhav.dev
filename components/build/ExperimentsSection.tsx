"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { SendToAgent } from "@/components/build/SendToAgent";
import { usePlusHere } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { Field, Input, TextArea } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { ProgressBar } from "@/components/ui/MetaLine";
import { Select, optionClasses } from "@/components/ui/Select";
import { EXPERIMENT_TEMPLATES, type ExperimentTemplate } from "@/content/experiments";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { VIABILITY_COPY } from "@/content/viability";
import { experimentsPrompt } from "@/lib/agent-prompts";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { AlertEventView } from "@/lib/alerts/schema";
import type { TokenAnalytics } from "@/lib/analytics";
import { CANVAS_BLOCKS } from "@/lib/canvas";
import { newItemId } from "@/lib/canvas-items";
import { familyOf } from "@/lib/economics";
import { EXPERIMENT_LIMITS, type Experiment, type ExperimentStatus, FINISHED_STATUSES, dueLine, normalizeExperiments, orderExperiments } from "@/lib/experiments";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/explorer";
import { formatDayShort } from "@/lib/format";
import type { ProjectDoc } from "@/lib/ideation";
import { kitShapes } from "@/lib/kits";
import { TESTER_LIMITS, type TesterFeedback, type TesterInvite, inviteState, testerPath } from "@/lib/tester";
import { cutAtWord } from "@/lib/text";
import { cn } from "@/lib/utils";
import { PROFILE_KEYS, VALUE_AREAS } from "@/lib/value-canvas";
import { projectChainOf } from "@/lib/chains";

const E = VIABILITY_COPY.experiments;

type AssumptionChoice = { value: string; label: string; kind: "canvas" | "value"; ref: string; text: string };

/** The canvas and value canvas items an experiment can test, as select options. */
function assumptionChoices(doc: ProjectDoc): AssumptionChoice[] {
  const out: AssumptionChoice[] = [];
  for (const b of CANVAS_BLOCKS) for (const i of doc.canvas?.[b] ?? []) out.push({ value: `canvas:${i.id}`, label: `${STUDIO_PLUS_COPY.canvas.blocks[b].label}, ${i.text}`, kind: "canvas", ref: i.id, text: i.text });
  for (const k of PROFILE_KEYS) {
    const c = doc.valueCanvas?.[k];
    if (!c) continue;
    for (const a of VALUE_AREAS) for (const i of c[a]) out.push({ value: `value:${k}:${i.id}`, label: `${STUDIO_PLUS_COPY.valueCanvas.areas[a].label}, ${i.text}`, kind: "value", ref: i.id, text: i.text });
  }
  return out;
}

interface Draft {
  id: string;
  assumption: string;
  assumptionText: string;
  hypothesis: string;
  test: string;
  metric: string;
  passBar: string;
  killCriterion: string;
  deadline: string;
}

function draftFrom(e: Experiment, choices: AssumptionChoice[]): Draft {
  const hit = e.assumption.kind !== "text" && e.assumption.ref ? choices.find((c) => c.ref === e.assumption.ref) : undefined;
  return { id: e.id, assumption: hit?.value ?? "", assumptionText: e.assumption.text, hypothesis: e.hypothesis, test: e.test, metric: e.metric, passBar: e.passBar, killCriterion: e.killCriterion, deadline: e.deadline };
}

function fromTemplate(t: ExperimentTemplate | null, assumption: string, choices: AssumptionChoice[]): Draft {
  const day = new Date(Date.now() + (t?.days ?? 14) * 86_400_000).toISOString().slice(0, 10);
  const hit = choices.find((c) => c.value === assumption);
  return { id: newItemId(), assumption, assumptionText: hit?.text ?? "", hypothesis: t?.hypothesis ?? "", test: t?.test ?? "", metric: t?.metric ?? "", passBar: t?.passBar ?? "", killCriterion: t?.killCriterion ?? "", deadline: day };
}

/** The number a pass bar names as its total, "8 of 10 testers" reads 10. */
function totalOf(passBar: string): number | undefined {
  const m = /\bof\s+(\d{1,3})\b/.exec(passBar);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 && n <= TESTER_LIMITS.maxUses.max ? n : undefined;
}

/**
 * Experiments (M171, V6): cards ordered running, planned, finished, each
 * reading the assumption it tests, the hypothesis, the test, the pass bar
 * and kill criterion side by side, the deadline as a sentence, a thin
 * progress line when a tester invite is attached, and the evidence as a
 * short timeline. New experiment opens a template picker then the card
 * in edit mode; a canvas item's Test this lands here with the item as the
 * assumption. Only a person sets passed or failed, with a result.
 */
export function ExperimentsSection({
  projectId,
  doc,
  patch,
  setDoc,
  agentMode,
  agentConnected,
  token,
}: {
  projectId: string;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  setDoc: (doc: ProjectDoc) => void;
  agentMode: AgentWriteMode;
  agentConnected: boolean;
  /** The launched or linked token, for onchain evidence. */
  token?: { address: string } | null;
}) {
  const list = doc.experiments ?? [];
  const choices = useMemo(() => assumptionChoices(doc), [doc]);
  const family = familyOf(kitShapes(doc.kit));
  const templates = family ? EXPERIMENT_TEMPLATES[family] : [];
  const testerKit = usePlusHere("tester_kit").ok;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);
  const [verdict, setVerdict] = useState<{ id: string; status: "passed" | "failed"; result: string } | null>(null);
  const [adding, setAdding] = useState<{ id: string; text: string; url: string } | null>(null);
  const [testers, setTesters] = useState<{ invites: TesterInvite[]; feedback: TesterFeedback[] } | null>(null);
  const [onchain, setOnchain] = useState<{ events: AlertEventView[]; totals: TokenAnalytics | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Test this on a canvas (M171) lands here with the item as the assumption, once per page load; the URL is read directly so the section needs no Suspense boundary.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("experiment") !== "new") return;
    const a = params.get("assumption") ?? "";
    setDraft((cur) => cur ?? fromTemplate(null, choices.some((c) => c.value === a) ? a : "", choices));
    window.setTimeout(() => document.getElementById("viability-experiments")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const write = (next: Experiment[]) => {
    const clean = normalizeExperiments(next, doc);
    if (clean.length) patch({ experiments: clean });
    else {
      const { experiments: _e, ...rest } = doc;
      setDoc(rest as ProjectDoc);
    }
  };
  const update = (id: string, p: Partial<Experiment>) => write(list.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const addEvidence = (id: string, text: string, url?: string) => update(id, { evidence: [...(list.find((e) => e.id === id)?.evidence ?? []), { text, ...(url ? { url } : {}), at: new Date().toISOString(), by: "team" }] });

  const save = () => {
    if (!draft) return;
    const hit = choices.find((c) => c.value === draft.assumption);
    const e: Experiment = {
      id: draft.id,
      assumption: hit ? { kind: hit.kind, ref: hit.ref, text: hit.text } : { kind: "text", text: draft.assumptionText },
      hypothesis: draft.hypothesis,
      test: draft.test,
      metric: draft.metric,
      passBar: draft.passBar,
      killCriterion: draft.killCriterion,
      deadline: draft.deadline,
      status: list.find((x) => x.id === draft.id)?.status ?? "planned",
      evidence: list.find((x) => x.id === draft.id)?.evidence ?? [],
      ...(list.find((x) => x.id === draft.id)?.testerInviteId ? { testerInviteId: list.find((x) => x.id === draft.id)!.testerInviteId } : {}),
      createdAt: list.find((x) => x.id === draft.id)?.createdAt ?? new Date().toISOString(),
    };
    write(list.some((x) => x.id === e.id) ? list.map((x) => (x.id === e.id ? e : x)) : [...list, e]);
    setDraft(null);
  };

  // The tester invites and feedback, read when an experiment has one attached.
  const needsTesters = list.some((e) => e.testerInviteId);
  useEffect(() => {
    if (!needsTesters || !testerKit) return;
    fetch(`/api/ideation/projects/${projectId}/testers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { invites: TesterInvite[]; feedback: TesterFeedback[] } | null) => d && setTesters(d))
      .catch(() => null);
  }, [projectId, needsTesters, testerKit]);

  const startWithInvite = async (e: Experiment) => {
    setBusy(e.id);
    setNote(null);
    try {
      const steps = e.test.split(/\n+|(?<=[.;])\s+/).map((s) => s.trim()).filter(Boolean).slice(0, TESTER_LIMITS.steps.max).map((s) => cutAtWord(s, TESTER_LIMITS.steps.each));
      const res = await fetch(`/api/ideation/projects/${projectId}/testers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: cutAtWord(e.hypothesis || e.assumption.text, TESTER_LIMITS.label.max), steps: steps.length ? steps : [cutAtWord(e.hypothesis, TESTER_LIMITS.steps.each)], maxUses: totalOf(e.passBar) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const { invite } = (await res.json()) as { invite: TesterInvite };
      update(e.id, { status: "running", testerInviteId: invite.token });
      setTesters((t) => (t ? { ...t, invites: [...t.invites, invite] } : { invites: [invite], feedback: [] }));
    } catch {
      setNote(VIABILITY_COPY.dependencies.failed);
    } finally {
      setBusy(null);
    }
  };

  const loadOnchain = async () => {
    if (onchain) return;
    const [alerts, analytics] = await Promise.all([
      fetch(`/api/ideation/projects/${projectId}/alerts`).then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ events?: AlertEventView[] } | null>,
      token ? (fetch(`/api/ideation/projects/${projectId}/analytics?token=${token.address}`).then((r) => (r.ok ? r.json() : null)).catch(() => null) as Promise<{ analytics?: TokenAnalytics | null } | null>) : Promise.resolve(null),
    ]);
    setOnchain({ events: (alerts?.events ?? []).slice(0, 10), totals: analytics?.analytics ?? null });
  };

  const ordered = orderExperiments(list);
  const open = ordered.filter((e) => !FINISHED_STATUSES.includes(e.status));
  const finished = ordered.filter((e) => FINISHED_STATUSES.includes(e.status));
  const full = list.length >= EXPERIMENT_LIMITS.max;
  const chain = projectChainOf(doc);
  const canQueue = agentConnected && agentMode !== "off";
  const assumptionHref = (e: Experiment) => (e.assumption.kind === "canvas" ? "?tab=model#model-canvas" : e.assumption.kind === "value" ? "?tab=model#model-value" : null);

  const card = (e: Experiment) => {
    const invite = e.testerInviteId ? testers?.invites.find((i) => i.token === e.testerInviteId) : undefined;
    const feedback = e.testerInviteId ? (testers?.feedback ?? []).filter((f) => f.inviteToken === e.testerInviteId) : [];
    const stamp = e.evidence[0] ? E.filledBy[e.evidence[0].by](formatDayShort(e.createdAt)) : E.filledBy.team(formatDayShort(e.createdAt));
    const href = assumptionHref(e);
    return (
      <article key={e.id} id={`experiment-${e.id}`} className="space-y-3 rounded-lg border border-ink-700/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-xs text-ink-400">
            <span className="font-medium text-ink-100">{E.statuses[e.status]}.</span> {E.assumption.toLowerCase()},{" "}
            {href ? (
              <a href={href} className="text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline">
                {e.assumption.text}
              </a>
            ) : (
              <span className="text-ink-200">{e.assumption.text}</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <button type="button" onClick={() => setDraft(draftFrom(e, choices))} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline">
              {E.edit}
            </button>
            <button type="button" onClick={() => write(list.filter((x) => x.id !== e.id))} className="text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline">
              {E.remove}
            </button>
          </div>
        </div>
        <p className="text-base leading-relaxed text-ink-50">{e.hypothesis}</p>
        {e.test ? <p className="text-sm leading-relaxed text-ink-300">{e.test}</p> : null}
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <p className="text-ink-300">
            <span className="text-xs uppercase tracking-wide text-ink-500">{E.passBar}</span> {e.passBar || "…"}
          </p>
          <p className="text-ink-300">
            <span className="text-xs uppercase tracking-wide text-ink-500">{E.killCriterion}</span> {e.killCriterion || "…"}
          </p>
        </div>
        <p className="text-xs text-ink-400">
          {dueLine(e.deadline)}
          {e.metric ? ` · ${E.metric}, ${e.metric}` : ""} · {stamp}
        </p>
        {invite ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-400">
            <ProgressBar done={invite.uses} total={invite.maxUses} className="w-40" />
            <span>{E.inviteLine(invite.uses, invite.maxUses)}</span>
            {inviteState(invite) === "open" ? (
              <a href={testerPath(invite.token)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-300 hover:text-ink-50 hover:underline">
                {E.inviteLink} <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="text-xs font-medium text-ink-200">{E.evidence}</p>
          {e.evidence.length === 0 && feedback.length === 0 ? <p className="text-xs text-ink-500">{E.evidenceNone}</p> : null}
          <ul className="space-y-1 text-xs text-ink-300">
            {e.evidence.map((ev, i) => (
              <li key={`${ev.at}:${i}`}>
                {ev.url ? (
                  <a href={ev.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink-200 underline-offset-2 hover:text-ink-50 hover:underline">
                    {ev.text} <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-ink-200">{ev.text}</span>
                )}
                <span className="text-ink-500">{` · ${E.evidenceLine(E.evidenceBy[ev.by], formatDayShort(ev.at))}`}</span>
              </li>
            ))}
            {feedback.map((f) => (
              <li key={f.id}>
                <span className="text-ink-200">{E.testerEvidence(f.stepIndex + 1, f.rating, f.note)}</span>
                <span className="text-ink-500">{` · ${formatDayShort(f.createdAt)}`}</span>
              </li>
            ))}
          </ul>
        </div>
        {adding?.id === e.id ? (
          <div className="space-y-2 rounded-md border border-ink-700/40 p-3">
            <Field label={E.evidenceText}>
              <Input value={adding.text} maxLength={EXPERIMENT_LIMITS.evidence.text} onChange={(ev) => setAdding({ ...adding, text: ev.target.value })} autoFocus />
            </Field>
            <Field label={E.evidenceUrl}>
              <Input value={adding.url} maxLength={EXPERIMENT_LIMITS.evidence.url} placeholder="https://" onChange={(ev) => setAdding({ ...adding, url: ev.target.value })} />
            </Field>
            <div className="flex gap-3 text-xs">
              <Button size="sm" disabled={!adding.text.trim()} onClick={() => { addEvidence(e.id, adding.text.trim(), /^https:\/\/\S+$/.test(adding.url.trim()) ? adding.url.trim() : undefined); setAdding(null); }}>
                {E.save}
              </Button>
              <button type="button" onClick={() => setAdding(null)} className="text-ink-400 hover:text-ink-50 hover:underline">
                {E.cancel}
              </button>
            </div>
          </div>
        ) : null}
        {verdict?.id === e.id ? (
          <div className="space-y-2 rounded-md border border-ink-700/40 p-3">
            <p className="text-xs text-ink-400">{E.verdictConfirm(verdict.status)}</p>
            <Field label={E.result}>
              <TextArea value={verdict.result} rows={3} maxLength={EXPERIMENT_LIMITS.result} placeholder={E.resultPlaceholder} onChange={(ev) => setVerdict({ ...verdict, result: ev.target.value })} />
            </Field>
            <div className="flex gap-3 text-xs">
              <Button size="sm" disabled={!verdict.result.trim()} onClick={() => { update(e.id, { status: verdict.status, result: verdict.result.trim() }); setVerdict(null); }}>
                {E.confirm}
              </Button>
              <button type="button" onClick={() => setVerdict(null)} className="text-ink-400 hover:text-ink-50 hover:underline">
                {E.cancel}
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {e.status === "planned" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => update(e.id, { status: "running" })}>
                {E.start}
              </Button>
              {testerKit ? (
                <Button size="sm" variant="outline" disabled={busy === e.id} title={E.inviteHint} onClick={() => void startWithInvite(e)}>
                  {E.startWithInvite}
                </Button>
              ) : null}
            </>
          ) : null}
          {e.status === "running" ? (
            <>
              <button type="button" onClick={() => setAdding({ id: e.id, text: "", url: "" })} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline">
                {E.addEvidence}
              </button>
              <Menu
                align="left"
                width="w-80"
                trigger={({ toggle }) => (
                  <button type="button" onClick={() => { void loadOnchain(); toggle(); }} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline">
                    {E.onchain}
                  </button>
                )}
              >
                {!onchain ? (
                  <MenuItem disabled>{VIABILITY_COPY.dependencies.checking}</MenuItem>
                ) : onchain.events.length === 0 && !onchain.totals ? (
                  <MenuItem disabled>{E.onchainNone}</MenuItem>
                ) : (
                  <>
                    {onchain.totals ? (
                      <MenuItem onSelect={() => addEvidence(e.id, E.onchainTotals(onchain.totals!.holders, onchain.totals!.last7.trades), token ? explorerAddressUrl(token.address, chain) : undefined)}>{E.onchainTotals(onchain.totals.holders, onchain.totals.last7.trades)}</MenuItem>
                    ) : null}
                    {onchain.events.map((ev) => (
                      <MenuItem key={ev.id} onSelect={() => addEvidence(e.id, E.onchainEvent(ev.kind, ev.line), ev.txHash.startsWith("0x") ? explorerTxUrl(ev.txHash, chain) : undefined)}>
                        <span className="min-w-0 truncate">{E.onchainEvent(ev.kind, ev.line)}</span>
                      </MenuItem>
                    ))}
                  </>
                )}
              </Menu>
              <button type="button" onClick={() => setVerdict({ id: e.id, status: "passed", result: e.result ?? "" })} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline">
                {E.setPassed}
              </button>
              <button type="button" onClick={() => setVerdict({ id: e.id, status: "failed", result: e.result ?? "" })} className="text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline">
                {E.setFailed}
              </button>
              <button type="button" onClick={() => update(e.id, { status: "stopped" })} className="text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline">
                {E.stop}
              </button>
            </>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-400">{list.length ? VIABILITY_COPY.sections.experiments.empty : E.empty}</p>
        <div className="flex flex-col items-end gap-2">
          <SendToAgent label={VIABILITY_COPY.assets.send} queueLabel={VIABILITY_COPY.assets.queue} copyLabel={VIABILITY_COPY.assets.copyPrompt} prompt={experimentsPrompt(doc.name, projectId)} canQueue={false} />
          {!draft ? (
            <Button size="sm" disabled={full} title={full ? E.capReached : undefined} onClick={() => setPicking(true)}>
              {E.new}
            </Button>
          ) : null}
        </div>
      </div>
      {picking && !draft ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-700/60 p-3">
          <Field label={E.templateLabel}>
            <Select
              defaultValue=""
              onChange={(ev) => {
                const t = templates.find((x) => x.key === ev.target.value) ?? null;
                setDraft(fromTemplate(t, "", choices));
                setPicking(false);
              }}
            >
              <option value="" disabled>
                {E.templateLabel}
              </option>
              <option value="blank" className={optionClasses}>
                {E.blank}
              </option>
              {templates.map((t) => (
                <option key={t.key} value={t.key} className={optionClasses}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <button type="button" onClick={() => setPicking(false)} className="pb-2.5 text-xs text-ink-400 hover:text-ink-50 hover:underline">
            {E.cancel}
          </button>
        </div>
      ) : null}
      {draft ? (
        <div className="space-y-4 rounded-lg border border-ink-700/60 p-4">
          <Field label={E.assumption} hint={E.assumptionHint}>
            <Select value={draft.assumption} muted={!draft.assumption} onChange={(ev) => setDraft({ ...draft, assumption: ev.target.value })}>
              <option value="" className={optionClasses}>
                {E.assumptionFree}
              </option>
              {choices.map((c) => (
                <option key={c.value} value={c.value} className={optionClasses}>
                  {cutAtWord(c.label, 90)}
                </option>
              ))}
            </Select>
          </Field>
          {!draft.assumption ? (
            <Field label={E.assumptionText}>
              <Input value={draft.assumptionText} maxLength={EXPERIMENT_LIMITS.text} onChange={(ev) => setDraft({ ...draft, assumptionText: ev.target.value })} />
            </Field>
          ) : null}
          <Field label={E.hypothesis}>
            <Input value={draft.hypothesis} maxLength={EXPERIMENT_LIMITS.text} placeholder={E.hypothesisPlaceholder} onChange={(ev) => setDraft({ ...draft, hypothesis: ev.target.value })} />
          </Field>
          <Field label={E.test}>
            <TextArea value={draft.test} rows={2} maxLength={EXPERIMENT_LIMITS.text} placeholder={E.testPlaceholder} onChange={(ev) => setDraft({ ...draft, test: ev.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={E.metric}>
              <Input value={draft.metric} maxLength={EXPERIMENT_LIMITS.text} placeholder={E.metricPlaceholder} onChange={(ev) => setDraft({ ...draft, metric: ev.target.value })} />
            </Field>
            <Field label={E.deadline}>
              <Input type="date" value={draft.deadline} onChange={(ev) => setDraft({ ...draft, deadline: ev.target.value })} />
            </Field>
            <Field label={E.passBar}>
              <Input value={draft.passBar} maxLength={EXPERIMENT_LIMITS.text} placeholder={E.passBarPlaceholder} onChange={(ev) => setDraft({ ...draft, passBar: ev.target.value })} />
            </Field>
            <Field label={E.killCriterion}>
              <Input value={draft.killCriterion} maxLength={EXPERIMENT_LIMITS.text} placeholder={E.killCriterionPlaceholder} onChange={(ev) => setDraft({ ...draft, killCriterion: ev.target.value })} />
            </Field>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Button size="sm" disabled={!draft.hypothesis.trim() && !draft.assumptionText.trim() && !draft.assumption} onClick={save}>
              {E.save}
            </Button>
            <button type="button" onClick={() => setDraft(null)} className="text-ink-400 hover:text-ink-50 hover:underline">
              {E.cancel}
            </button>
          </div>
        </div>
      ) : null}
      {note ? <p className="text-xs text-rose-400">{note}</p> : null}
      <div className={cn("space-y-3", !open.length && "hidden")}>{open.map(card)}</div>
      {finished.length ? (
        <Collapsible summary={E.showFinished(finished.length)}>
          <ul className="space-y-2">
            {finished.map((e) => (
              <li key={e.id} id={`experiment-${e.id}`} className="space-y-1 text-sm">
                <p className="text-ink-100">{E.finishedLine(E.statuses[e.status], e.hypothesis || e.assumption.text, formatDayShort(e.evidence[e.evidence.length - 1]?.at ?? e.createdAt))}</p>
                {e.result ? <p className="text-xs leading-relaxed text-ink-400">{e.result}</p> : null}
                <p className="text-xs">
                  <button type="button" onClick={() => setDraft(draftFrom(e, choices))} className="text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline">
                    {E.edit}
                  </button>{" "}
                  <button type="button" onClick={() => write(list.filter((x) => x.id !== e.id))} className="text-ink-500 underline-offset-2 hover:text-ink-50 hover:underline">
                    {E.remove}
                  </button>
                </p>
              </li>
            ))}
          </ul>
        </Collapsible>
      ) : null}
    </div>
  );
}

export type { ExperimentStatus };
