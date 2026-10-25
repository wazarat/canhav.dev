"use client";

import { DraftControl, type DraftMeta } from "@/components/build/DraftControl";
import { ReachBlock } from "@/components/build/ReachBlock";
import type { Reach } from "@/lib/reach";
import type { ProfileKey } from "@/lib/value-canvas";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";
import { TextField } from "@/components/ideation/TextField";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftIcpPrompt } from "@/lib/agent-prompts-draft";
import { ICP_LIMITS, type Icp, emptyIcp, listFromText } from "@/lib/icp";

/**
 * Ideal customer profiles on Decisions (M114): one or two profiles, each
 * with a name, a summary, three comma separated lists, the buying trigger
 * and the objection; Draft from the personas and the subsector's
 * protocols, or the prompt for the owner's agent.
 */
export function IcpEditor({
  projectId,
  name,
  meta,
  patch,
  agentMode,
  profiles,
  onChange,
  reach,
  hasAssets = false,
  onReach,
}: {
  projectId: string;
  name: string;
  /** The record's draft requests and marks, the patch that writes them, and the agent mode (M117). */
  meta: DraftMeta;
  patch: (p: Partial<ProjectDoc>) => void;
  agentMode: AgentWriteMode;
  profiles: Icp[] | undefined;
  onChange: (next: Icp[]) => void;
  /** The last reachable wallets read per profile (M168) and the write that keeps a new one. */
  reach?: Reach;
  hasAssets?: boolean;
  onReach?: (next: Reach) => void;
}) {
  const C = STUDIO_PLUS_COPY.icp;
  const list = profiles ?? [];
  const set = (i: number, partial: Partial<Icp>) => onChange(list.map((p, j) => (j === i ? { ...p, ...partial } : p)));
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      <DraftControl<{ profiles: Icp[] }>
        projectId={projectId}
        doc={meta}
        patch={patch}
        agentMode={agentMode}
        kind="icp"
        label={C.draft}
        onResult={(value) => onChange(value.profiles.slice(0, ICP_LIMITS.profiles.max))}
        agentPrompt={draftIcpPrompt(name, projectId)}
      />
      {list.map((p, i) => (
        <div key={i} className="space-y-4 rounded-lg border border-ink-700/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-ink-200">{C.profile(i + 1)}</p>
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-[11px] text-ink-400 transition-colors hover:text-ink-100">
              {C.remove(i + 1)}
            </button>
          </div>
          <TextField label={C.fields.name.label} value={p.name} onChange={(v) => set(i, { name: v })} max={ICP_LIMITS.name.max} placeholder={C.fields.name.placeholder} />
          <TextField label={C.fields.summary.label} value={p.summary} onChange={(v) => set(i, { summary: v })} max={ICP_LIMITS.summary.max} rows={3} placeholder={C.fields.summary.placeholder} />
          <div className="grid gap-4 md:grid-cols-3">
            {(["walletsTheyUse", "channels", "protocolsTheyUse"] as const).map((k) => (
              <Field key={k} label={C.fields[k].label} hint={C.listHint}>
                {/* Keyed on the value so a landed draft remounts the uncontrolled input (M141). */}
                <Input key={p[k].join("|")} defaultValue={p[k].join(", ")} placeholder={C.fields[k].placeholder} onBlur={(e) => set(i, { [k]: listFromText(e.target.value) })} />
              </Field>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label={C.fields.buyingTrigger.label} value={p.buyingTrigger} onChange={(v) => set(i, { buyingTrigger: v })} max={ICP_LIMITS.short.max} rows={2} placeholder={C.fields.buyingTrigger.placeholder} />
            <TextField label={C.fields.objection.label} value={p.objection} onChange={(v) => set(i, { objection: v })} max={ICP_LIMITS.short.max} rows={2} placeholder={C.fields.objection.placeholder} />
          </div>
          {onReach ? (
            <ReachBlock projectId={projectId} profile={String(i) as ProfileKey} hasAssets={hasAssets} summary={reach?.[String(i) as ProfileKey]} onSummary={(s) => onReach({ ...(reach ?? {}), [String(i) as ProfileKey]: s })} />
          ) : null}
        </div>
      ))}
      {list.length < ICP_LIMITS.profiles.max ? (
        <Button size="sm" variant="outline" onClick={() => onChange([...list, emptyIcp()])}>
          {C.add}
        </Button>
      ) : null}
    </div>
  );
}
