"use client";

import { useEffect, useState } from "react";

import { type DraftMeta, DraftButton } from "@/components/build/DraftButton";
import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Field } from "@/components/ui/Input";
import { SegmentedField } from "@/components/ui/Segmented";
import { TextField } from "@/components/ideation/TextField";
import { BUILD_COPY } from "@/content/build";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { draftWeeklyPrompt } from "@/lib/agent-prompts-draft";
import type { ProjectDoc } from "@/lib/ideation";
import { DEFAULT_CADENCE, type ProjectUpdate, UPDATE_CADENCES, UPDATE_LIMITS, type UpdateCadence, type WeeklyDraft, periodLabel, periodOf, updateDue } from "@/lib/updates";

/**
 * This week's update on the Overview (M124, Studio+): the current week's
 * row (drafted by the agent over set_weekly_update, by CanHav, or typed),
 * edited in place, saved as a draft and published to the public page;
 * earlier weeks as a short list. PlusGate for a free account.
 */
export function WeeklyUpdateCard({ projectId, name, doc, patch, agentMode }: { projectId: string; name: string; doc: DraftMeta & Pick<ProjectDoc, "updateCadence">; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode }) {
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

function Inner({ projectId, name, doc, patch, agentMode }: { projectId: string; name: string; doc: DraftMeta & Pick<ProjectDoc, "updateCadence">; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode }) {
  const C = BUILD_COPY.weekly;
  const cadence: UpdateCadence = doc.updateCadence ?? DEFAULT_CADENCE;
  const week = periodOf(cadence);
  const [updates, setUpdates] = useState<ProjectUpdate[] | null>(null);
  const [body, setBody] = useState("");
  const [highlights, setHighlights] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const current = updates?.find((u) => u.weekOf === week) ?? null;
  const earlier = (updates ?? []).filter((u) => u.weekOf !== week && u.status === "published");

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
      setHighlights(mine.highlights.join("\n"));
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
        body: JSON.stringify({ weekOf: week, body: body.trim(), highlights: highlights.split("\n").map((h) => h.trim()).filter(Boolean).slice(0, UPDATE_LIMITS.highlights.max) }),
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
    const row = current && current.body === body.trim() ? current : await save();
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

  const dirty = body.trim() !== (current?.body ?? "") || highlights.split("\n").map((h) => h.trim()).filter(Boolean).join("\n") !== (current?.highlights ?? []).join("\n");
  const state = !current ? C.none : current.status === "published" ? C.published(new Date(current.publishedAt ?? current.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })) : C.draft(current.author === "agent" ? C.byAgent : current.author === "canhav" ? C.byCanhav : C.byYou);

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-400">
        {periodLabel(cadence, week)} · {state}
        {updates && updateDue(cadence, updates) ? ` · ${C.due}` : ""}
      </p>
      <SegmentedField
        label={C.cadenceLabel}
        hint={C.cadenceHint}
        value={cadence}
        onChange={(v) => patch({ updateCadence: v })}
        options={UPDATE_CADENCES.map((c) => ({ value: c, label: C.cadences[c] }))}
      />
      <p className="text-xs text-ink-500">{C.intro}</p>
      <DraftButton<WeeklyDraft>
        projectId={projectId}
        kind="weekly"
        body={{ projectId }}
        label={C.draftButtons[cadence]}
        gate={false}
        doc={doc}
        patch={patch}
        agentMode={agentMode}
        agentPrompt={draftWeeklyPrompt(name, projectId)}
        onResult={(value) => {
          setBody(value.body);
          setHighlights(value.highlights.join("\n"));
        }}
      />
      <TextField label={C.bodyLabel} value={body} onChange={setBody} max={UPDATE_LIMITS.body.max} rows={6} placeholder={C.bodyPlaceholder} />
      <Field label={C.highlightsLabel} hint={C.highlightsHint}>
        <textarea
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-electric-500 focus:outline-none"
          placeholder={C.highlightsPlaceholder}
        />
      </Field>
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
