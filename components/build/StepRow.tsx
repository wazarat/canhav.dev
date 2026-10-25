"use client";

import { useState } from "react";
import { BookOpen, Check, ChevronDown, Trash2 } from "lucide-react";

import { TemplateCard } from "@/components/ideation/kit/TemplateCard";
import { TemplateDecisionRow } from "@/components/ideation/kit/TemplateDecision";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { Input } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { SendToAgent } from "@/components/build/SendToAgent";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { CHECKLIST_COPY, shapeName } from "@/content/kits/copy";
import { featuresFor } from "@/content/kits/features";
import { templateById } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
import type { ProjectChain } from "@/lib/chains";
import {
  type GroupState,
  KIT_LIMITS,
  type ProjectKit,
  type StepGroup,
  featuresSuggesting,
  groupEvidence,
  groupReason,
  groupState,
  allShapes,
  customStepShapes,
  isProductShape,
  removeStepGroup,
  setCustomStepShapes,
  setGroupNotApplicable,
  setStepEvidence,
  setTemplateDecision,
  templateState,
  toggleStepGroup,
} from "@/lib/kits";
import type { ContractTemplate } from "@/lib/templates";
import { cn } from "@/lib/utils";

const BY_ID = new Map(KIT_CATALOG.map((r) => [r.id, r] as const));

const STATE_TONE: Record<GroupState, StatusTone> = {
  open: "neutral",
  partial: "info",
  done: "success",
  na: "neutral",
};

function stateLabel(state: GroupState): string {
  const S = BUILD_COPY.status;
  return state === "done" ? S.done : state === "partial" ? S.partial : state === "na" ? S.na : S.todo;
}

/** The active templates a step lists, a ticked feature's suggestions first, then catalog order (M64). */
function rankedTemplates(group: StepGroup, kit: ProjectKit): Array<{ t: ContractTemplate; by: string[] }> {
  // Features are ours; an own shape (M176) has none of its own.
  const features = featuresFor(group.shapes.filter(isProductShape));
  return group.templates
    .map((id) => templateById(id))
    .filter((t): t is ContractTemplate => Boolean(t) && t!.status === "active")
    .map((t) => ({ t, by: featuresSuggesting(features, kit, t.id).map((f) => f.title) }))
    .sort((a, b) => Number(b.by.length > 0) - Number(a.by.length > 0));
}

/**
 * The resources a step or a review pass points at, behind a small menu
 * (M95). Opening one goes to a new tab; the pack itself stays with the
 * agent.
 */
/**
 * The shapes a step serves (M176), as one line of names. A step the team
 * added opens a menu to put it on more shapes or take it off one; a
 * catalog step's shapes come from the catalog and the shapes that picked it.
 */
function ShapesLine({ group, kit, onPatchKit }: { group: StepGroup; kit: ProjectKit; onPatchKit: (partial: Partial<ProjectKit>) => void }) {
  const S = BUILD_COPY.shapes;
  const names = group.shapes.map((x) => shapeName(kit, x)).join(", ");
  if (!group.custom) return <span className="text-[11px] text-ink-400">{names}</span>;
  const all = allShapes(kit);
  const step = kit.customSteps?.find((c) => c.id === group.key);
  const current = step ? customStepShapes(step) : [...group.shapes];
  return (
    <Menu
      align="left"
      width="w-64"
      trigger={({ open, toggle }) => (
        <button type="button" onClick={toggle} aria-expanded={open} aria-label={S.editShapes} className="inline-flex items-center gap-1 text-[11px] text-ink-300 transition-colors hover:text-ink-50">
          {names}
          <ChevronDown aria-hidden className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      )}
    >
      <p className="px-3.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">{S.shapesLine}</p>
      {all.map((x) => {
        const on = current.includes(x);
        const last = on && current.length === 1;
        return (
          <button
            key={x}
            type="button"
            role="menuitemcheckbox"
            aria-checked={on}
            disabled={last}
            title={last ? S.atLeastOne : undefined}
            onClick={() => onPatchKit(setCustomStepShapes(kit, group.key, on ? current.filter((c) => c !== x) : [...current, x]))}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-ink-100 transition-colors hover:bg-ink-800/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border", on ? "border-ink-300 bg-ink-300 text-ink-950" : "border-ink-600")}>
              {on ? <Check className="h-3 w-3" /> : null}
            </span>
            {shapeName(kit, x)}
          </button>
        );
      })}
    </Menu>
  );
}

export function ReadMenu({ ids }: { ids: readonly string[] }) {
  const links = ids.map((id) => BY_ID.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
  if (!links.length) return null;
  return (
    <Menu
      align="left"
      width="w-72"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-[11px] text-electric-300 transition-colors hover:text-electric-200"
        >
          <BookOpen aria-hidden className="h-3 w-3" />
          {BUILD_COPY.row.read(links.length)}
          <ChevronDown aria-hidden className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      )}
    >
      {links.map((r) => (
        <MenuItem key={r.id} onSelect={() => window.open(r.href, "_blank", "noopener")}>
          <span className="truncate">{r.title}</span>
        </MenuItem>
      ))}
    </Menu>
  );
}

/**
 * The status control of a build step (M95): a menu showing Todo, Partial,
 * Done or Not applicable. Done and Todo tick or untick every member id;
 * Not applicable asks for a reason inline and leaves the step out of the
 * count; Applies again brings it back.
 */
function StepStatusControl({
  group,
  kit,
  onPatchKit,
}: {
  group: StepGroup;
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const S = BUILD_COPY.status;
  const state = groupState(group, kit);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const canSave = reason.trim().length >= KIT_LIMITS.notApplicable.textMin;
  const save = () => {
    if (!canSave) return;
    onPatchKit(setGroupNotApplicable(kit, group, reason));
    setAsking(false);
    setReason("");
  };
  return (
    <div className="shrink-0">
      <Menu
        align="left"
        width="w-44"
        trigger={({ open, toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={stateLabel(state)}
            className="inline-flex items-center gap-1"
          >
            <StatusChip tone={STATE_TONE[state]} className="px-2 py-0.5 text-[11px]">
              {stateLabel(state)}
            </StatusChip>
            <ChevronDown aria-hidden className="h-3 w-3 text-ink-500" />
          </button>
        )}
      >
        {state !== "done" ? <MenuItem onSelect={() => onPatchKit(toggleStepGroup(kit, group, true))}>{S.done}</MenuItem> : null}
        {state !== "open" && state !== "na" ? (
          <MenuItem onSelect={() => onPatchKit(toggleStepGroup(kit, group, false))}>{S.todo}</MenuItem>
        ) : null}
        {state === "na" ? (
          <MenuItem onSelect={() => onPatchKit(setGroupNotApplicable(kit, group, null))}>{S.appliesAgain}</MenuItem>
        ) : (
          <MenuItem onSelect={() => setAsking(true)}>{S.na}</MenuItem>
        )}
      </Menu>
      {asking ? (
        <div className="mt-2 w-72 space-y-2 rounded-lg border border-ink-700/60 bg-ink-950/60 p-3">
          <p className="text-[11px] text-ink-300">{S.reasonPrompt}</p>
          <Input
            autoFocus
            value={reason}
            maxLength={KIT_LIMITS.notApplicable.textMax}
            placeholder={S.reasonPlaceholder}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setAsking(false);
            }}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={!canSave} onClick={save}>
              {S.reasonSave}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              {S.reasonCancel}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One build step as a list row (M95): status, title and detail, the shape
 * labels, the evidence line, the first suggested template with its
 * decision and the rest behind a fold, the Read menu and remove.
 */
/** What a row needs to hand its step to the agent (M152). */
export interface StepSend {
  prompt: string;
  canQueue: boolean;
  full: boolean;
  /** When the owner queued it, ISO, or null. */
  queuedAt: string | null;
  /** When an agent change ticked it, ISO, or null. */
  doneByAgentAt: string | null;
  onQueue: () => void;
  onCancel: () => void;
}

const when = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export function StepRow({
  group,
  kit,
  chain,
  onPatchKit,
  send,
}: {
  group: StepGroup;
  kit: ProjectKit;
  chain: ProjectChain;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** Send to agent (M152); absent on rows that cannot be handed over. */
  send?: StepSend;
}) {
  const R = BUILD_COPY.row;
  const state = groupState(group, kit);
  const na = state === "na";
  const done = state === "done";
  const reason = groupReason(group, kit);
  const evidence = groupEvidence(group, kit) ?? "";
  const templates = rankedTemplates(group, kit);
  const [first, ...rest] = templates;
  const setEvidence = (text: string) => {
    let next: Pick<ProjectKit, "evidence"> = { evidence: kit.evidence };
    for (const id of group.ids) next = setStepEvidence(next, id, text || null);
    onPatchKit(next);
  };
  return (
    <li className={cn("flex items-start gap-3 border-t border-ink-800/60 py-3 first:border-t-0", na && "opacity-70")}>
      <StepStatusControl group={group} kit={kit} onPatchKit={onPatchKit} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={cn("text-sm text-ink-50", (done || na) && "text-ink-400 line-through decoration-ink-600")}>{group.title}</p>
        {na ? (
          <p className="text-[11px] text-ink-400">{CHECKLIST_COPY.naBecause(reason ?? "")}</p>
        ) : group.detail ? (
          <p className="text-xs leading-relaxed text-ink-400">{group.detail}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <ShapesLine group={group} kit={kit} onPatchKit={onPatchKit} />
          {group.custom ? <span className="text-[11px] text-ink-500">{R.yourStep}</span> : null}
          {group.source === "dependency" ? <span className="text-[11px] text-ink-400">{R.fromDependencyCheck}</span> : null}
          <ReadMenu ids={group.resources} />
          {send && !done && !na ? <SendToAgent prompt={send.prompt} canQueue={send.canQueue} full={send.full} onQueue={send.onQueue} /> : null}
        </div>
        {send?.queuedAt && !done && !na ? (
          <p className="text-[11px] text-ink-400">
            {R.queuedSince(when(send.queuedAt))}{" "}
            <button type="button" onClick={send.onCancel} className="text-ink-400 transition-colors hover:text-ink-50 hover:underline">
              {R.cancelQueue}
            </button>
          </p>
        ) : send?.doneByAgentAt && done ? (
          <p className="text-[11px] text-ink-400">{R.doneByAgent(when(send.doneByAgentAt))}</p>
        ) : null}
        {!na ? (
          <Input
            value={evidence}
            maxLength={KIT_LIMITS.evidence.textMax}
            placeholder={R.evidencePlaceholder}
            aria-label={CHECKLIST_COPY.evidence}
            onChange={(e) => setEvidence(e.target.value)}
            className="h-8 max-w-md text-xs"
          />
        ) : null}
        {first ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <a href={first.t.repoUrl} target="_blank" rel="noreferrer" className="text-ink-200 transition-colors hover:text-electric-200">
              {first.t.name}
            </a>
            {first.by.length ? <span className="text-ink-500">{CHECKLIST_COPY.featureSuggests(first.by)}</span> : null}
            <TemplateChoice state={templateState(kit, first.t.id)} onDecide={(d) => onPatchKit(setTemplateDecision(kit, first.t.id, d))} />
            {rest.length ? (
              <Collapsible summary={R.more(rest.length)} summaryClassName="text-[11px]" className="w-full">
                <div className="space-y-2">
                  {rest.map(({ t, by }) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      chains={[chain]}
                      className="p-3"
                      footer={
                        <TemplateDecisionRow
                          state={templateState(kit, t.id)}
                          suggestedBy={by.length ? CHECKLIST_COPY.featureSuggests(by) : undefined}
                          onDecide={(d) => onPatchKit(setTemplateDecision(kit, t.id, d))}
                        />
                      }
                    />
                  ))}
                </div>
              </Collapsible>
            ) : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={CHECKLIST_COPY.remove(group.title)}
        title={CHECKLIST_COPY.remove(group.title)}
        onClick={() => onPatchKit(removeStepGroup(kit, group))}
        className="shrink-0 rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-900/40 hover:text-rose-400"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </li>
  );
}

/** Using or Not using on the first template of a step; the chosen one again clears. */
function TemplateChoice({
  state,
  onDecide,
}: {
  state: "accepted" | "rejected" | "open";
  onDecide: (decision: "accepted" | "rejected" | null) => void;
}) {
  const R = BUILD_COPY.row;
  const pill = (value: "accepted" | "rejected", label: string) => (
    <button
      type="button"
      aria-pressed={state === value}
      onClick={() => onDecide(state === value ? null : value)}
      className={cn(
        "rounded-md border px-2 py-0.5 text-[11px] transition-colors",
        state === value ? "border-ink-500 bg-ink-800/60 text-ink-50" : "border-ink-700/60 text-ink-400 hover:text-ink-100",
      )}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-1.5">
      {pill("accepted", R.using)}
      {pill("rejected", R.notUsing)}
      {state !== "open" ? (
        <StatusChip tone={TEMPLATE_COPY.stateTone[state]} className="px-1.5 py-0 text-[10px]">
          {TEMPLATE_COPY.state[state]}
        </StatusChip>
      ) : null}
    </span>
  );
}
