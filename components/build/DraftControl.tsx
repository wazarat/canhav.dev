"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

import { PlusGate, usePlusHere } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { useCopyToClipboard } from "@/components/ui/useCopy";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { DRAFT_KIND_FEATURES, type DraftKind } from "@/lib/draft/limits";
import { type Drafted, findRequest, withDrafted, withRequest, withoutRequest } from "@/lib/draft/requests";
import type { ProjectDoc } from "@/lib/ideation";
import { cn } from "@/lib/utils";

/** The slice of the record the control reads and writes. */
export type DraftMeta = Pick<ProjectDoc, "draftRequests" | "drafted">;

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * One Draft control per section (M141, replacing the three buttons of
 * M117). The primary button does the likely thing, queueing the draft for
 * the connected agent when the project allows one and drafting with
 * CanHav otherwise, and the chevron opens a menu with every way: the
 * agent, CanHav with the drafts left this month, and the prompt to paste
 * into another editor. Under it, one sentence says what stands, queued
 * since when with a Cancel, or drafted by whom on which day. The `link`
 * variant is a Redraft text link opening the same menu, for a block
 * inside a section. A free account sees nothing here (M136).
 */
export function DraftControl<T>({
  projectId,
  kind,
  target,
  body,
  label,
  onResult,
  agentPrompt,
  doc,
  patch,
  agentMode = "propose",
  variant = "button",
  gate = true,
  className,
}: {
  projectId: string;
  kind: DraftKind;
  /** The part of the field this control drafts (the canvas block), so two blocks queue apart. */
  target?: string;
  body?: Record<string, unknown>;
  label?: string;
  onResult: (value: T) => void;
  /** The paste prompt for the owner's agent. */
  agentPrompt?: string;
  /** The record's requests and drafted marks, and the patch that writes them. */
  doc?: DraftMeta;
  patch?: (p: Partial<ProjectDoc>) => void;
  /** The project's agent write mode; off means no agent, so CanHav drafts first. */
  agentMode?: AgentWriteMode;
  /** A button with a chevron, or a Redraft text link. */
  variant?: "button" | "link";
  /** False to render the control alone, when a parent already gates. */
  gate?: boolean;
  className?: string;
}) {
  const C = STUDIO_PLUS_COPY.draft;
  const here = usePlusHere(DRAFT_KIND_FEATURES[kind]);
  const [working, setWorking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard(agentPrompt ?? "");

  if (gate && !here.ok) return <PlusGate feature={DRAFT_KIND_FEATURES[kind]} />;

  const canQueue = Boolean(doc && patch) && agentMode !== "off";
  const open = doc ? findRequest(doc, kind, target) : undefined;
  const drafted: Drafted[DraftKind] | undefined = doc?.drafted?.[kind];

  const queue = () => {
    if (!doc || !patch) return;
    patch({ draftRequests: withRequest(doc, kind, body, "owner", target) });
  };
  const cancel = () => {
    if (!doc || !patch) return;
    patch({ draftRequests: withoutRequest(doc, kind, target) });
  };

  const server = async () => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/draft/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = (await res.json()) as { value?: T; remaining?: number; error?: string };
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!res.ok || data.value === undefined) {
        setError(data.error ?? C.failed);
        return;
      }
      onResult(data.value);
      if (doc && patch) patch({ drafted: withDrafted(doc, kind, "canhav"), draftRequests: withoutRequest(doc, kind, target) });
    } catch {
      setError(C.failed);
    } finally {
      setWorking(false);
    }
  };

  const primary = () => (canQueue ? queue() : void server());
  const text = working ? C.working : (label ?? C.draft);

  const menu = (trigger: (state: { open: boolean; toggle: () => void }) => React.ReactNode) => (
    <Menu align="left" width="w-72 max-w-[calc(100vw-2rem)]" className="inline-block" trigger={trigger}>
      {canQueue ? (
        <MenuItem onSelect={queue} disabled={Boolean(open)}>
          <span className="flex flex-col items-start">
            <span>{C.menu.agent}</span>
            <span className="text-xs text-ink-500">{C.menu.agentHint}</span>
          </span>
        </MenuItem>
      ) : null}
      <MenuItem onSelect={() => void server()} disabled={working}>
        <span className="flex flex-col items-start">
          <span>{C.menu.canhav}</span>
          {remaining !== null ? <span className="text-xs text-ink-500">{C.remaining(remaining)}</span> : null}
        </span>
      </MenuItem>
      {agentPrompt ? (
        <MenuItem onSelect={() => void copy()}>
          <span className="flex flex-col items-start">
            <span>{copied ? C.menu.copied : C.menu.copy}</span>
            <span className="text-xs text-ink-500">{C.menu.copyHint}</span>
          </span>
        </MenuItem>
      ) : null}
    </Menu>
  );

  const status = open ? (
    <p className="text-xs text-ink-400">
      {C.queuedSince(when(open.requestedAt))}.{" "}
      <button type="button" onClick={cancel} className="text-ink-200 hover:underline">
        {C.cancel}
      </button>
    </p>
  ) : drafted ? (
    <p className="text-xs text-ink-500">{C.draftedBy[drafted.by](day(drafted.at))}</p>
  ) : null;

  if (variant === "link") {
    return (
      <div className={cn("space-y-1", className)}>
        {menu(({ toggle, open: menuOpen }) => (
          <button type="button" onClick={toggle} aria-expanded={menuOpen} disabled={working} className="inline-flex items-center gap-1 text-xs text-ink-300 hover:text-ink-100 hover:underline disabled:opacity-60">
            {working ? C.working : (label ?? C.redraft)}
            <ChevronDown aria-hidden className={cn("h-3 w-3 transition-transform", menuOpen && "rotate-180")} />
          </button>
        ))}
        {status}
        {error ? <p className="text-xs text-rose-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* The menu anchors on the whole group, so it opens from the button's left edge and fits a phone width. */}
      {menu(({ toggle, open: menuOpen }) => (
        <div className="inline-flex items-stretch">
          <Button size="sm" onClick={primary} disabled={working || Boolean(open && canQueue)} aria-busy={working} className="rounded-r-none">
            <Sparkles aria-hidden className="h-3.5 w-3.5" /> {text}
          </Button>
          <Button size="sm" onClick={toggle} aria-label={C.menu.open} aria-expanded={menuOpen} disabled={working} className="rounded-l-none border-l border-electric-400/60 px-2">
            <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 transition-transform", menuOpen && "rotate-180")} />
          </Button>
        </div>
      ))}
      {status}
      {error ? <p className="text-xs text-rose-400">{error}</p> : null}
    </div>
  );
}
