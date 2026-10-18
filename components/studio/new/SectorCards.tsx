"use client";

import { Check, CircleDashed, Coins, Droplets, Landmark, Layers, Scale, TrendingUp } from "lucide-react";

import { TrackCardShell, type TrackTint, trackCardSurface } from "@/components/studio/TrackCardShell";
import { SECTOR_OPTIONS } from "@/content/ideation";
import { NEW_PROJECT_COPY } from "@/content/studio-new";
import type { Sector } from "@/lib/sectors";
import { cn } from "@/lib/utils";

export type SectorChoice = Sector | "undecided" | "";

const TINTS: readonly TrackTint[] = ["electric", "neon", "signal"];

/** One icon per sector, in SECTOR_OPTIONS order, and one for undecided. */
const ICONS: Record<Sector | "undecided", React.ComponentType<{ className?: string }>> = {
  credit_lending: Landmark,
  staking: Coins,
  liquidity_infra: Droplets,
  perps_derivatives: TrendingUp,
  rwa_infra: Scale,
  other: Layers,
  undecided: CircleDashed,
};

const ACCENT: Record<TrackTint, string> = {
  electric: "hover:border-electric-500/60 focus-visible:ring-electric-500/70",
  neon: "hover:border-neon-500/60 focus-visible:ring-neon-500/70",
  signal: "hover:border-signal-500/60 focus-visible:ring-signal-500/70",
};

const SELECTED: Record<TrackTint, string> = {
  electric: "border-electric-500",
  neon: "border-neon-500",
  signal: "border-signal-500",
};

const ICON_TONE: Record<TrackTint, string> = {
  electric: "text-electric-400",
  neon: "text-neon-400",
  signal: "text-signal-400",
};

/** The icon tile that sits in the shell's floating panel. */
function IconGraphic({ icon: Icon, tint }: { icon: React.ComponentType<{ className?: string }>; tint: TrackTint }) {
  return (
    <div className="flex h-8 items-center gap-2.5">
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700/60 bg-ink-900", ICON_TONE[tint])}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="h-1.5 flex-1 rounded-full bg-ink-800" />
    </div>
  );
}

/**
 * The sector step of the new project flow (M91): the six sectors as the
 * studio track cards, then one thin full width row for "I have not decided
 * yet", as one optional radio group. Clicking the chosen one again clears
 * it.
 */
export function SectorCards({ value, onChange }: { value: SectorChoice; onChange: (v: SectorChoice) => void }) {
  const C = NEW_PROJECT_COPY.sector;
  const cards: Array<{ value: Sector; title: string; sentence: string }> = SECTOR_OPTIONS.map((o) => ({
    value: o.value,
    title: o.title ?? o.label,
    sentence: o.sentence ?? "",
  }));
  const undecided = value === "undecided";
  const Undecided = ICONS.undecided;
  return (
    <div role="radiogroup" aria-label={C.label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => {
        const tint = TINTS[i % TINTS.length];
        const selected = value === card.value;
        return (
          <button
            key={card.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? "" : card.value)}
            className={cn(trackCardSurface, ACCENT[tint], selected && SELECTED[tint])}
          >
            <TrackCardShell
              compact
              tint={tint}
              badge={
                selected ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-ink-700/60 bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-ink-100">
                    <Check aria-hidden className="h-3 w-3" />
                    {C.selected}
                  </span>
                ) : undefined
              }
              graphic={<IconGraphic icon={ICONS[card.value]} tint={tint} />}
              title={card.title}
              description={card.sentence}
            />
          </button>
        );
      })}
      <button
        type="button"
        role="radio"
        aria-checked={undecided}
        onClick={() => onChange(undecided ? "" : "undecided")}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors sm:col-span-2 lg:col-span-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-500/60",
          undecided ? "border-ink-400 bg-ink-800/40" : "border-ink-700/60 hover:border-ink-500",
        )}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-700/60 bg-ink-900 text-ink-300">
          <Undecided className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink-50">{C.undecidedTitle}</span>
          <span className="block text-xs text-ink-400">{C.undecidedSentence}</span>
        </span>
        {undecided ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-ink-700/60 bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-ink-100">
            <Check aria-hidden className="h-3 w-3" />
            {C.selected}
          </span>
        ) : null}
      </button>
    </div>
  );
}
