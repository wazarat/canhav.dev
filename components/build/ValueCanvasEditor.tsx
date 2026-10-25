"use client";

import { useState } from "react";

import { DraftControl, type DraftMeta } from "@/components/build/DraftControl";
import { ItemsEditor } from "@/components/build/ItemsEditor";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { VIABILITY_COPY } from "@/content/viability";
import { draftValueCanvasPrompt } from "@/lib/agent-prompts-draft";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { type CanvasItem, normalizeItems } from "@/lib/canvas-items";
import type { Icp } from "@/lib/icp";
import type { ProjectDoc } from "@/lib/ideation";
import { cutAtWord } from "@/lib/text";
import { cn } from "@/lib/utils";
import {
  ANSWERS,
  CUSTOMER_AREAS,
  type ProfileKey,
  VALUE_ITEM_LIMITS,
  VALUE_MAP_AREAS,
  type ValueArea,
  type ValueCanvas,
  type ValueCanvasDraft,
  type ValueCanvases,
  type ValueItem,
  emptyValueCanvas,
  normalizeValueCanvas,
  seedFromProfile,
  unanswered,
} from "@/lib/value-canvas";

/**
 * The Value Proposition Canvas on the Business model tab (M157, F16): one
 * canvas per ideal customer profile picked at the top, the value map as a
 * square on the left (products and services, pain relievers, gain
 * creators), the customer profile as a circle on the right (jobs, pains,
 * gains), a thin connector between them, each area a short list of items
 * opened for editing in place (the M155 editor). A reliever or creator
 * links to the pains or gains it answers, and the fit check under the
 * canvas names what nothing answers yet.
 */
export function ValueCanvasEditor({
  projectId,
  name,
  meta,
  patch,
  agentMode,
  profiles,
  value,
  onChange,
  differentiator,
  verdicts,
  testHref,
}: {
  projectId: string;
  name: string;
  meta: DraftMeta;
  patch: (p: Partial<ProjectDoc>) => void;
  agentMode: AgentWriteMode;
  profiles: Icp[] | undefined;
  value: ValueCanvases | undefined;
  onChange: (next: ValueCanvases | undefined) => void;
  /** The competitor line, echoed under the canvas as the one sentence to quote. */
  differentiator?: string;
  /** The verdicts experiments gave the items (M170) and the Test this link (M171), when the session has Viability. */
  verdicts?: ReadonlyMap<string, { verdict: "validated" | "invalidated"; experimentId: string }>;
  testHref?: (key: ProfileKey, itemId: string) => string;
}) {
  const C = STUDIO_PLUS_COPY.valueCanvas;
  const list = profiles ?? [];
  const [key, setKey] = useState<ProfileKey>("0");
  const [editing, setEditing] = useState<ValueArea | null>(null);
  if (!list.length) return <p className="text-xs leading-relaxed text-ink-400">{C.noProfiles}</p>;
  const current: ValueCanvas = value?.[key] ?? emptyValueCanvas();
  const profileName = (i: number) => list[i]?.name?.trim() || C.profile(i + 1);
  // The picker must fit a phone beside a second long name, so a label is cut at a word past 24 characters.
  const shortName = (i: number) => {
    const n = profileName(i);
    return n.length > 24 ? `${cutAtWord(n, 24)}…` : n;
  };
  const setCanvas = (c: ValueCanvas) => {
    const clean = normalizeValueCanvas(c);
    const next: ValueCanvases = { ...(value ?? {}) };
    if (clean) next[key] = clean;
    else delete next[key];
    onChange(Object.keys(next).length ? next : undefined);
  };
  const setArea = (area: ValueArea, items: ValueItem[]) => setCanvas({ ...current, [area]: items });
  const fromLines = (lines: readonly string[]): ValueItem[] => normalizeItems(lines, VALUE_ITEM_LIMITS);
  const seed = () => {
    const s = seedFromProfile(list[Number(key)]);
    setCanvas({ ...current, ...(s.pains ? { pains: fromLines(s.pains) } : {}), ...(s.gains ? { gains: fromLines(s.gains) } : {}) });
  };
  const empty = !Object.values(current).some((items) => items.length);
  const openPains = unanswered(current, "pains").length;
  const openGains = unanswered(current, "gains").length;

  const area = (a: ValueArea, className?: string) => {
    const items = current[a];
    const open = editing === a;
    const target = ANSWERS[a];
    const targets = target ? current[target] : [];
    return (
      <section key={a} className={cn("min-w-0 space-y-1.5", className)}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">{C.areas[a].label}</h4>
          {open ? null : (
            <button type="button" onClick={() => setEditing(a)} className="shrink-0 text-xs text-ink-400 transition-colors hover:text-ink-50 hover:underline">
              {items.length ? STUDIO_PLUS_COPY.canvas.edit : STUDIO_PLUS_COPY.canvas.add}
            </button>
          )}
        </div>
        {open ? (
          <div className="space-y-2">
            <ItemsEditor items={items} onChange={(next) => setArea(a, next.map((i) => ({ ...(items.find((x) => x.id === i.id) ?? {}), ...i })))} onDone={() => setEditing(null)} limits={VALUE_ITEM_LIMITS} placeholder={C.areas[a].hint} />
            {target ? (
              <div className="space-y-1.5 text-xs">
                {items.filter((i) => i.text.trim()).map((i) => (
                  <div key={i.id} className="rounded-md border border-ink-700/40 p-2">
                    <p className="text-ink-300">
                      {i.text} <span className="text-ink-500">{C.answers}</span>
                    </p>
                    {targets.length ? (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        {targets.map((t) => {
                          const on = (i.answers ?? []).includes(t.id);
                          return (
                            <label key={t.id} className="inline-flex items-center gap-1.5 text-ink-200">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={(e) => {
                                  const answers = e.target.checked ? [...(i.answers ?? []), t.id] : (i.answers ?? []).filter((id) => id !== t.id);
                                  setArea(a, items.map((x) => (x.id === i.id ? { ...x, answers } : x)));
                                }}
                                className="h-3.5 w-3.5 rounded border-ink-700 bg-ink-950 accent-electric-500"
                              />
                              {t.text}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1 text-ink-500">{C.answersNone}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : items.length ? (
          <ul className="space-y-1">
            {items.map((i: ValueItem) => (
              <li key={i.id} className="text-sm leading-snug text-ink-200">
                {i.text}
                {verdicts?.get(i.id) ? <span className="ml-1.5 text-xs text-ink-400">{VIABILITY_COPY.experiments.verdicts[verdicts.get(i.id)!.verdict]}</span> : null}
                {testHref && !verdicts?.get(i.id) ? (
                  <a href={testHref(key, i.id)} className="ml-1.5 text-xs text-ink-500 underline-offset-2 hover:text-ink-50 hover:underline">
                    {VIABILITY_COPY.experiments.testThis}
                  </a>
                ) : null}
                {i.refs?.length ? (
                  <span className="block text-xs text-ink-400">
                    {i.refs.map((r, n) => (
                      <span key={`${r.comparable}:${r.name}`}>
                        {n > 0 ? " · " : ""}
                        {STUDIO_PLUS_COPY.competitors.comparables.ref(r.comparable, r.name)}{" "}
                        <button type="button" aria-label={STUDIO_PLUS_COPY.competitors.comparables.refRemove} onClick={() => setArea(a, items.map((x) => (x.id === i.id ? { ...x, refs: (x.refs ?? []).filter((y) => !(y.comparable === r.comparable && y.name === r.name)) } : x)))} className="text-ink-500 underline-offset-2 hover:text-ink-50 hover:underline">
                          {STUDIO_PLUS_COPY.canvas.remove}
                        </button>
                      </span>
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <button type="button" onClick={() => setEditing(a)} className="text-left text-xs text-ink-500 hover:text-ink-300">
            {STUDIO_PLUS_COPY.canvas.empty}
          </button>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<ProfileKey>
          size="sm"
          ariaLabel={C.title}
          value={key}
          onChange={(k) => {
            setKey(k);
            setEditing(null);
          }}
          fill
          options={list.map((_, i) => ({ value: String(i) as ProfileKey, label: C.forProfile(shortName(i)), title: profileName(i) }))}
        />
        <div className="flex flex-wrap items-center gap-3">
          {empty ? (
            <Button size="sm" variant="outline" onClick={seed} title={C.seedHint}>
              {C.seed}
            </Button>
          ) : null}
          <DraftControl<ValueCanvasDraft>
            projectId={projectId}
            doc={meta}
            patch={patch}
            agentMode={agentMode}
            kind="value_canvas"
            target={key}
            body={{ profile: Number(key) }}
            label={C.draft}
            onResult={(v) => {
              const next = { ...current };
              for (const [a, lines] of Object.entries(v) as Array<[ValueArea, string[]]>) {
                const items = fromLines(lines);
                if (items.length) next[a] = items;
              }
              setCanvas(next);
            }}
            agentPrompt={draftValueCanvasPrompt(name, projectId)}
            gate={false}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1.5rem_1fr] md:items-stretch">
        <div className="rounded-xl border border-ink-700/60 bg-ink-900 p-4">
          <p className="mb-3 text-xs font-medium text-ink-200">{C.valueMap}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {area(VALUE_MAP_AREAS[0], "sm:row-span-2")}
            {area(VALUE_MAP_AREAS[1])}
            {area(VALUE_MAP_AREAS[2])}
          </div>
        </div>
        <div aria-hidden className="hidden md:flex md:items-center">
          <span className="h-px w-full bg-ink-700" />
        </div>
        <div className="rounded-xl border border-ink-700/60 bg-ink-900 p-4 md:rounded-[2rem]">
          <p className="mb-3 text-xs font-medium text-ink-200">{C.customerProfile}</p>
          <div className="space-y-4">{CUSTOMER_AREAS.map((a) => area(a))}</div>
        </div>
      </div>
      <p className="text-xs text-ink-400">
        {openPains === 0 && openGains === 0 && !empty ? C.allAnswered : [openPains ? C.unansweredPains(openPains) : null, openGains ? C.unansweredGains(openGains) : null].filter(Boolean).join(" ")}
      </p>
      {differentiator?.trim() ? (
        <p className="text-sm leading-relaxed text-ink-200">
          <span className="text-xs uppercase tracking-wide text-ink-500">{C.differLine}</span> {differentiator}{" "}
          <a href="#model-competitors" className="text-xs text-ink-400 hover:text-ink-50 hover:underline">
            {C.differEdit}
          </a>
        </p>
      ) : null}
    </div>
  );
}
