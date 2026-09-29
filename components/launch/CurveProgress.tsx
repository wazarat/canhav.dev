import { formatEther } from "viem";

import { cn } from "@/lib/utils";

/**
 * Graduation progress for a bonding curve. Pure props so the launch form's
 * success screen, the token page, the studio rows and the project page can
 * all render the same bar from an indexer row or a live read.
 */
export function CurveProgress({
  raisedWei,
  thresholdWei,
  graduated,
  className,
  showLabel = true,
}: {
  raisedWei: bigint | string;
  thresholdWei: bigint | string;
  graduated?: boolean;
  className?: string;
  showLabel?: boolean;
}) {
  const raised = BigInt(raisedWei);
  const threshold = BigInt(thresholdWei);
  const pct =
    threshold === 0n ? 0 : Math.min(100, Number((raised * 10_000n) / threshold) / 100);
  const label = graduated
    ? "Graduated"
    : `${trimEth(raised)} of ${trimEth(threshold)} ETH raised (${pct}%)`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={graduated ? 100 : pct}
        aria-label="Graduation progress"
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800"
      >
        <div
          className={cn("h-full rounded-full", graduated ? "bg-signal-400" : "bg-electric-500")}
          style={{ width: `${graduated ? 100 : pct}%` }}
        />
      </div>
      {showLabel ? <p className="tabular text-xs text-ink-400">{label}</p> : null}
    </div>
  );
}

/** "0.0123" rather than "0.012300000000000000". */
export function trimEth(wei: bigint): string {
  const s = formatEther(wei);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}
