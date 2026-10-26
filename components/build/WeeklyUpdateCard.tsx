"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { type DraftMeta, DraftControl } from "@/components/build/DraftControl";
import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Input, TextArea } from "@/components/ui/Input";
import { InfoTip } from "@/components/ui/InfoTip";
import { Segmented } from "@/components/ui/Segmented";
import { Select, optionClasses } from "@/components/ui/Select";
import { BUILD_COPY } from "@/content/build";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { sectionsFor } from "@/content/kits/checklists";
import { draftWeeklyPrompt } from "@/lib/agent-prompts-draft";
import { type Milestone, groupsByMilestone } from "@/lib/build-milestones";
import type { ProjectDoc } from "@/lib/ideation";
import { shapeName } from "@/content/kits/copy";
import { type ShapeId, allShapes, kitShapes } from "@/lib/kits";
import { DEFAULT_CADENCE, HIGHLIGHT_MILESTONES, type ProjectUpdate, UPDATE_CADENCES, UPDATE_LIMITS, type UpdateCadence, type UpdateFocus, type UpdateHighlight, type WeeklyBrief, type WeeklyDraft, periodLabel, periodOf, updateDue } from "@/lib/updates";

type UpdateDoc = DraftMeta & Pick<ProjectDoc, "updateCadence" | "kit">;

/** A highlight row while it is edited; an empty milestone, module or step is any (M189). */
interface Row {
  text: string;
  milestone: Milestone | "";
  shape: string;
  step: string;
}

const toRows = (items: readonly UpdateHighlight[]): Row[] => items.map((h) => ({ text: h.text, milestone: h.milestone ?? "", shape: h.shape ?? "", step: h.step ?? "" }));
const toItems = (rows: readonly Row[]): UpdateHighlight[] =>
  rows
    .map((r) => ({ text: r.text.trim(), milestone: r.milestone || null, ...(r.shape ? { shape: r.shape } : {}), ...(r.milestone && r.step ? { step: r.step } : {}) }))
    .filter((h) => h.text)
    .slice(0, UPDATE_LIMITS.highlights.max);
/** One string per row set, to tell whether the editor differs from the saved row. */
const sig = (items: readonly UpdateHighlight[]) => JSON.stringify(items.map((h) => [h.text, h.milestone, h.shape ?? "", h.step ?? ""]));

/** A focus row while it is edited (M183); an empty module or step is any. */
interface FocusRow {
  milestone: Milestone;
  shape: string;
  step: string;
  text: string;
}

const toFocusRows = (items: readonly UpdateFocus[]): FocusRow[] => items.map((f) => ({ milestone: f.milestone, shape: f.shape ?? "", step: f.step ?? "", text: f.text }));
const toFocusItems = (rows: readonly FocusRow[]): UpdateFocus[] =>
  rows
    .map((r) => ({ milestone: r.milestone, ...(r.shape ? { shape: r.shape } : {}), ...(r.step ? { step: r.step } : {}), text: r.text.trim() }))
    .filter((f) => f.text || f.step)
    .slice(0, UPDATE_LIMITS.focuses.max);
const focusSig = (items: readonly UpdateFocus[]) => JSON.stringify(items.map((f) => [f.milestone, f.shape ?? "", f.step ?? "", f.text]));

/**
 * This week's update on the Overview (M124, Studio+): the current week's
 * row (drafted by the agent over set_weekly_update, by CanHav, or typed),
 * edited in place, saved as a draft and published to the public page;
 * earlier weeks as a short list. PlusGate for a free account.
 */
export function WeeklyUpdateCard({ projectId, name, doc, patch, agentMode }: { projectId: string; name: string; doc: UpdateDoc; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode }) {
  const C = BUILD_COPY.weekly;
  return (
    <Card>
      <CardSection className="space-y-4">
        <h2 className="font-display text-base font-semibold text-ink-50">{C.title}</h2>
        <PlusGate feature="weekly_update">
          <Inner projectId={projectId} name={name} doc={doc} patch={patch} agentMode={agentMode} />
        </PlusGate>
      </CardSection>
    </Card>
  );
}

function Inner({ projectId, name, doc, patch, agentMode }: { projectId: string; name: string; doc: UpdateDoc; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode }) {
  const C = BUILD_COPY.weekly;
  const cadence: UpdateCadence = doc.updateCadence ?? DEFAULT_CADENCE;
  const week = periodOf(cadence);
  const [updates, setUpdates] = useState<ProjectUpdate[] | null>(null);
  const [body, setBody] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [focuses, setFocuses] = useState<FocusRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  /** The cadence picked but not saved yet (M174), and a short Saved after Save. */
  const [pendingCadence, setPendingCadence] = useState<UpdateCadence>(cadence);
  const [cadenceSaved, setCadenceSaved] = useState(false);
  const current = updates?.find((u) => u.weekOf === week) ?? null;
  const earlier = (updates ?? []).filter((u) => u.weekOf !== week && u.status === "published");
  // The build steps per milestone, for the step pick on each highlight (M174).
  const groups = useMemo(() => groupsByMilestone(sectionsFor(kitShapes(doc.kit), doc.kit ?? {})), [doc.kit]);
  const stepKey = (m: Milestone, step: string) => groups[m].find((g) => g.key === step || g.ids.includes(step))?.key ?? "";
  // The modules a focus can name (M183), ours and the team's own, and the steps of one module under one milestone.
  const modules = useMemo(() => allShapes(doc.kit).map((id) => ({ id, name: shapeName(doc.kit, id) })), [doc.kit]);
  const stepsFor = (m: Milestone, shape: string) => groups[m].filter((g) => !shape || g.shapes.includes(shape as ShapeId));

  useEffect(() => setPendingCadence(cadence), [cadence]);
  useEffect(() => {
    if (!cadenceSaved) return;
    const t = window.setTimeout(() => setCadenceSaved(false), 3000);
    return () => window.clearTimeout(t);
  }, [cadenceSaved]);

  const load = async () => {
    const res = await fetch(`/api/ideation/projects/${projectId}/updates`);
    if (!res.ok) {
      setFailed(C.loadFailed);
      return;
    }
    const list = ((await res.json()) as { updates: ProjectUpdate[] }).updates;
    setUpdates(list);
    const mine = list.find((u) => u.weekOf === week);
    if (mine) {
      setBody(mine.body);
      setRows(toRows(mine.highlightItems ?? mine.highlights.map((text) => ({ text, milestone: null }))));
      setFocuses(toFocusRows(mine.focusItems ?? []));
    }
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const save = async (): Promise<ProjectUpdate | null> => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekOf: week, body: body.trim(), highlights: toItems(rows), focuses: toFocusItems(focuses) }),
      });
      if (!res.ok) {
        setFailed(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? C.failed);
        return null;
      }
      const row = ((await res.json()) as { update: ProjectUpdate }).update;
      await load();
      return row;
    } finally {
      setBusy(false);
    }
  };
  const publish = async () => {
    const row = current && !dirty ? current : await save();
    if (!row) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/updates/${row.id}/publish`, { method: "POST" });
      if (!res.ok) setFailed(C.failed);
      await load();
    } finally {
      setBusy(false);
    }
  };
  /** Auto-summarize on the brief (M174): the three answers from the period's activity. */
  const summarize = async (): Promise<{ answers: Record<string, string> } | { error: string }> => {
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/updates/summarize`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { value?: WeeklyBrief; error?: string } | null;
      if (!res.ok || !data?.value) return { error: data?.error ?? C.failed };
      return { answers: { ...data.value } };
    } catch {
      return { error: C.failed };
    }
  };

  const savedItems = current ? (current.highlightItems ?? current.highlights.map((text) => ({ text, milestone: null }))) : [];
  const dirty = body.trim() !== (current?.body ?? "") || sig(toItems(rows)) !== sig(savedItems) || focusSig(toFocusItems(focuses)) !== focusSig(current?.focusItems ?? []);
  const state = !current ? C.none : current.status === "published" ? C.published(new Date(current.publishedAt ?? current.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })) : C.draft(current.author === "agent" ? C.byAgent : current.author === "canhav" ? C.byCanhav : C.byYou);
  const setRow = (i: number, next: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...next } : r)));
  const setFocus = (i: number, next: Partial<FocusRow>) => setFocuses((all) => all.map((r, j) => (j === i ? { ...r, ...next } : r)));

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-400">
        {periodLabel(cadence, week)} · {state}
        {updates && updateDue(cadence, updates) ? ` · ${C.due}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {/* The helper copy sits behind the info icon (owner feedback 2026-10-25). */}
        <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          {C.cadenceLabel}
          <InfoTip title={C.title}>
            <span className="block">{C.intro}</span>
            <span className="mt-2 block">{C.cadenceHint}</span>
            {current ? <span className="mt-2 block">{C.written}</span> : null}
          </InfoTip>
        </span>
        <Segmented
          value={pendingCadence}
          onChange={(v) => {
            setPendingCadence(v);
            setCadenceSaved(false);
          }}
          options={UPDATE_CADENCES.map((c) => ({ value: c, label: C.cadences[c] }))}
          ariaLabel={C.cadenceLabel}
        />
        {pendingCadence !== cadence ? (
          <Button
            size="sm"
            onClick={() => {
              patch({ updateCadence: pendingCadence });
              setCadenceSaved(true);
            }}
          >
            {C.cadenceSave}
          </Button>
        ) : cadenceSaved ? (
          <span className="text-xs text-ink-400">{C.cadenceSaved}</span>
        ) : null}
      </div>
      {/* One update per period (M174): once this period's row exists the team edits it below instead of drafting again. */}
      {current ? null : (
        <DraftControl<WeeklyDraft>
          projectId={projectId}
          kind="weekly"
          body={{ projectId }}
          label={C.draftButtons[cadence]}
          gate={false}
          doc={doc}
          patch={patch}
          agentMode={agentMode}
          agentPrompt={draftWeeklyPrompt(name, projectId)}
          summarize={summarize}
          onResult={(value) => {
            setBody(value.body);
            setRows(toRows(value.highlights.map((h) => ({ text: h.text, milestone: h.milestone ?? null }))));
          }}
        />
      )}
      <Block title={C.bodyLabel} aside={`${body.trim().length.toLocaleString("en-US")} / ${UPDATE_LIMITS.body.max.toLocaleString("en-US")}`}>
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={UPDATE_LIMITS.body.max}
          rows={6}
          placeholder={C.bodyPlaceholder}
          aria-label={C.bodyLabel}
          className="min-h-40 leading-relaxed"
        />
      </Block>
      <Block title={C.highlightsLabel} hint={C.highlightsHint} aside={`${rows.length} / ${UPDATE_LIMITS.highlights.max}`}>
        <div className="space-y-3">
          {rows.length === 0 ? <p className="text-sm text-ink-500">{C.highlightsEmpty}</p> : null}
          {rows.map((r, i) => {
            const steps = r.milestone ? stepsFor(r.milestone, r.shape) : [];
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-3 xl:grid-cols-[9rem_11rem_14rem_minmax(0,1fr)_auto] xl:items-center">
                <Select value={r.milestone} aria-label={C.highlightMilestone} muted={!r.milestone} onChange={(e) => setRow(i, { milestone: e.target.value as Milestone | "", step: "" })}>
                  <option value="" className={optionClasses}>
                    {C.noMilestone}
                  </option>
                  {HIGHLIGHT_MILESTONES.map((m) => (
                    <option key={m} value={m} className={optionClasses}>
                      {BUILD_COPY.milestones[m].label}
                    </option>
                  ))}
                </Select>
                <Select value={r.shape} aria-label={C.highlightModule} muted={!r.shape} onChange={(e) => setRow(i, { shape: e.target.value, step: "" })}>
                  <option value="" className={optionClasses}>
                    {C.anyModule}
                  </option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id} className={optionClasses}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={r.milestone ? (steps.some((g) => g.key === r.step) ? r.step : stepKey(r.milestone, r.step)) : ""}
                  aria-label={C.highlightStep}
                  muted={!r.step}
                  disabled={steps.length === 0}
                  onChange={(e) => setRow(i, { step: e.target.value })}
                >
                  <option value="" className={optionClasses}>
                    {C.anyStep}
                  </option>
                  {steps.map((g) => (
                    <option key={g.key} value={g.key} className={optionClasses}>
                      {g.title}
                    </option>
                  ))}
                </Select>
                <Input
                  value={r.text}
                  onChange={(e) => setRow(i, { text: e.target.value })}
                  maxLength={UPDATE_LIMITS.highlights.each}
                  placeholder={C.highlightsPlaceholder}
                  aria-label={C.highlightsLabel}
                  className="sm:col-span-2 xl:col-span-1"
                />
                <button type="button" onClick={() => setRows((all) => all.filter((_, j) => j !== i))} className="justify-self-start text-xs text-ink-400 hover:text-ink-100 hover:underline">
                  {C.removeHighlight}
                </button>
              </div>
            );
          })}
          {rows.length < UPDATE_LIMITS.highlights.max ? (
            <Button size="sm" variant="outline" onClick={() => setRows((all) => [...all, { text: "", milestone: all[all.length - 1]?.milestone ?? "", shape: all[all.length - 1]?.shape ?? "", step: "" }])}>
              <Plus aria-hidden className="h-3.5 w-3.5" /> {C.addHighlight}
            </Button>
          ) : null}
        </div>
      </Block>
      <Block title={C.focusesLabel[cadence]} hint={C.focusesHint} aside={`${focuses.length} / ${UPDATE_LIMITS.focuses.max}`}>
        <div className="space-y-3">
          {focuses.length === 0 ? <p className="text-sm text-ink-500">{C.focusesEmpty}</p> : null}
          {focuses.map((f, i) => {
            const steps = stepsFor(f.milestone, f.shape);
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-3 xl:grid-cols-[9rem_11rem_14rem_minmax(0,1fr)_auto] xl:items-center">
                <Select value={f.milestone} aria-label={C.focusMilestone} onChange={(e) => setFocus(i, { milestone: e.target.value as Milestone, step: "" })}>
                  {HIGHLIGHT_MILESTONES.map((m) => (
                    <option key={m} value={m} className={optionClasses}>
                      {BUILD_COPY.milestones[m].label}
                    </option>
                  ))}
                </Select>
                <Select value={f.shape} aria-label={C.focusModule} muted={!f.shape} onChange={(e) => setFocus(i, { shape: e.target.value, step: "" })}>
                  <option value="" className={optionClasses}>
                    {C.anyModule}
                  </option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id} className={optionClasses}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <Select value={steps.some((g) => g.key === f.step) ? f.step : stepKey(f.milestone, f.step)} aria-label={C.focusStep} muted={!f.step} disabled={steps.length === 0} onChange={(e) => setFocus(i, { step: e.target.value })}>
                  <option value="" className={optionClasses}>
                    {C.anyStep}
                  </option>
                  {steps.map((g) => (
                    <option key={g.key} value={g.key} className={optionClasses}>
                      {g.title}
                    </option>
                  ))}
                </Select>
                <Input
                  value={f.text}
                  onChange={(e) => setFocus(i, { text: e.target.value })}
                  maxLength={UPDATE_LIMITS.focuses.each}
                  placeholder={C.focusesPlaceholder}
                  aria-label={C.focusesLabel[cadence]}
                  className="sm:col-span-2 xl:col-span-1"
                />
                <button type="button" onClick={() => setFocuses((all) => all.filter((_, j) => j !== i))} className="justify-self-start text-xs text-ink-400 hover:text-ink-100 hover:underline">
                  {C.removeFocus}
                </button>
              </div>
            );
          })}
          {focuses.length < UPDATE_LIMITS.focuses.max ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFocuses((all) => [...all, { milestone: all[all.length - 1]?.milestone ?? "design", shape: all[all.length - 1]?.shape ?? "", step: "", text: "" }])}
            >
              <Plus aria-hidden className="h-3.5 w-3.5" /> {C.addFocus}
            </Button>
          ) : null}
        </div>
      </Block>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy || !body.trim() || !dirty} onClick={() => void save()}>
          {C.save}
        </Button>
        <Button size="sm" disabled={busy || !body.trim() || (current?.status === "published" && !dirty)} onClick={() => void publish()}>
          {C.publish}
        </Button>
        {failed ? <span className="text-xs text-rose-400">{failed}</span> : null}
      </div>
      {earlier.length ? (
        <ul className="space-y-1 border-t border-ink-800/70 pt-3 text-xs text-ink-400">
          {earlier.map((u) => (
            <li key={u.id}>
              <span className="text-ink-200">{periodLabel(u.cadence, u.weekOf)}</span> · {u.body.slice(0, 120)}
              {u.body.length > 120 ? "…" : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** One part of the update (M189): a readable heading, its hint and a count, set off by a rule. */
function Block({ title, hint, aside, children }: { title: string; hint?: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-ink-800/70 pt-5">
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink-50">{title}</h3>
          {aside ? <span className="shrink-0 text-xs tabular-nums text-ink-500">{aside}</span> : null}
        </div>
        {hint ? <p className="text-xs text-ink-400">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
