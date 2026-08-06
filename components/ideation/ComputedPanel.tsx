"use client";

import { useMemo } from "react";

import { UnlockCalendarChart } from "@/components/ideation/UnlockCalendarChart";
import { WarningResourceCard } from "@/components/ideation/WarningResourceCard";
import { StatusChip } from "@/components/ui/StatusChip";
import type { TokenDesignDoc } from "@/lib/ideation";
import { deriveTokenomics } from "@/lib/tokenDesign";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold text-ink-50">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

/**
 * The computed-outputs rail: everything here is derived from the doc and
 * shown back — never asked. Recomputes on every keystroke.
 */
export function ComputedPanel({ doc }: { doc: TokenDesignDoc }) {
  const d = useMemo(() => deriveTokenomics(doc), [doc]);
  const fmtPct = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`;

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl border border-ink-800/70 p-5">
        <h3 className="text-sm font-medium text-ink-200">Computed — not asked</h3>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Stat label="Float at launch" value={fmtPct(d.floatAtLaunchPct)} />
          <Stat
            label="FDV : float"
            value={d.fdvToFloat ? `${d.fdvToFloat % 1 === 0 ? d.fdvToFloat : d.fdvToFloat.toFixed(1)}×` : "—"}
          />
          <Stat label="Treasury" value={fmtPct(d.treasuryPct)} />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-500">Unlock calendar</p>
          <UnlockCalendarChart calendar={d.unlockCalendar} clusterMonths={d.clusterMonths} />
        </div>
        {d.milestoneUncertain && (
          <div className="mt-3">
            <StatusChip tone="info" variant="block">
              Milestone-conditional releases can&apos;t be dated — the calendar
              plots them at the latest possible month.
            </StatusChip>
          </div>
        )}
        {(d.teamVsInvestors.team || d.teamVsInvestors.investors) && (
          <div className="mt-5 space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-500">Team vs investors</p>
            {d.teamVsInvestors.team && (
              <p className="text-xs text-ink-300">
                Team: {d.teamVsInvestors.team.cliffMonths}mo cliff ·{" "}
                {d.teamVsInvestors.team.durationMonths}mo total
              </p>
            )}
            {d.teamVsInvestors.investors && (
              <p className="text-xs text-ink-300">
                Investors: {d.teamVsInvestors.investors.cliffMonths}mo cliff ·{" "}
                {d.teamVsInvestors.investors.durationMonths}mo total
              </p>
            )}
            {d.teamVsInvestors.teamCliffShorter && (
              <StatusChip tone="warning">Team cliff is shorter than investors&apos;</StatusChip>
            )}
          </div>
        )}
      </div>

      {d.warnings.map((w) => (
        <WarningResourceCard key={w} warning={w} />
      ))}
    </div>
  );
}
