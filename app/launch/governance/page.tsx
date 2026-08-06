import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { decodeFunctionData, formatEther } from "viem";

import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { LAUNCH_CHAIN } from "@/content/launch";
import { feeSplitterAbi } from "@/lib/abi/feeSplitter";
import { launchAmmAbi } from "@/lib/abi/launchAmm";
import { tokenFactoryAbi } from "@/lib/abi/tokenFactory";
import { getTimelockOperations, type IndexedTimelockOperation } from "@/lib/indexer";
import { publicClient } from "@/lib/publicClient";

export const metadata: Metadata = {
  title: "Launchpad governance",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const timelockAbi = [
  {
    type: "function",
    name: "getMinDelay",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface FactoryState {
  launchFee: bigint;
  maxLaunchFee: bigint;
  treasury: string;
  pauser: string;
  paused: boolean;
  owner: string;
  minDelay: bigint;
}

interface AmmState {
  defaultProtocolFeeBps: number;
  maxProtocolFeeBps: number;
  projectShareBps: number;
  ammOwner: string;
  splitterPayees: string[];
  splitterShares: number[];
}

async function getAmmState(): Promise<AmmState | null> {
  try {
    const amm = { abi: launchAmmAbi, address: LAUNCH_CHAIN.ammAddress } as const;
    const [defaultBps, maxBps, projectBps, ammOwner, payeesResult] = await Promise.all([
      publicClient.readContract({ ...amm, functionName: "defaultProtocolFeeBps" }),
      publicClient.readContract({ ...amm, functionName: "MAX_PROTOCOL_FEE_BPS" }),
      publicClient.readContract({ ...amm, functionName: "PROJECT_SHARE_BPS" }),
      publicClient.readContract({ ...amm, functionName: "owner" }),
      publicClient.readContract({
        abi: feeSplitterAbi,
        address: LAUNCH_CHAIN.splitterAddress,
        functionName: "payees",
      }),
    ]);
    return {
      defaultProtocolFeeBps: Number(defaultBps),
      maxProtocolFeeBps: Number(maxBps),
      projectShareBps: Number(projectBps),
      ammOwner: ammOwner as string,
      splitterPayees: [...(payeesResult as readonly [readonly string[], readonly number[]])[0]],
      splitterShares: [...(payeesResult as readonly [readonly string[], readonly number[]])[1]].map(Number),
    };
  } catch {
    return null;
  }
}

async function getFactoryState(): Promise<FactoryState | null> {
  try {
    const factory = { abi: tokenFactoryAbi, address: LAUNCH_CHAIN.factoryAddress } as const;
    const [launchFee, maxLaunchFee, treasury, pauser, paused, owner, minDelay] =
      await Promise.all([
        publicClient.readContract({ ...factory, functionName: "launchFee" }),
        publicClient.readContract({ ...factory, functionName: "MAX_LAUNCH_FEE" }),
        publicClient.readContract({ ...factory, functionName: "treasury" }),
        publicClient.readContract({ ...factory, functionName: "pauser" }),
        publicClient.readContract({ ...factory, functionName: "paused" }),
        publicClient.readContract({ ...factory, functionName: "owner" }),
        publicClient.readContract({
          abi: timelockAbi,
          address: LAUNCH_CHAIN.timelockAddress,
          functionName: "getMinDelay",
        }),
      ]);
    return { launchFee, maxLaunchFee, treasury, pauser, paused, owner, minDelay };
  } catch {
    return null;
  }
}

/** Human sentence for a timelock operation's calldata, best-effort. */
function describeCall(op: IndexedTimelockOperation): string {
  const target = op.target.toLowerCase();
  if (target === LAUNCH_CHAIN.factoryAddress.toLowerCase()) {
    try {
      const { functionName, args } = decodeFunctionData({
        abi: tokenFactoryAbi,
        data: op.data as `0x${string}`,
      });
      switch (functionName) {
        case "setLaunchFee":
          return `Set the launch fee to ${formatEther(args[0] as bigint)} ETH`;
        case "setTreasury":
          return `Set the treasury to ${args[0]}`;
        case "setPauser":
          return `Set the pause guardian to ${args[0]}`;
        case "setImplementation":
          return `Register new token implementation ${args[0]}`;
        case "unpause":
          return "Unpause launches";
        default:
          return `Factory call: ${functionName}`;
      }
    } catch {
      return `Factory call (selector ${op.data.slice(0, 10)})`;
    }
  }
  if (target === LAUNCH_CHAIN.ammAddress.toLowerCase()) {
    try {
      const { functionName, args } = decodeFunctionData({
        abi: launchAmmAbi,
        data: op.data as `0x${string}`,
      });
      if (functionName === "setDefaultProtocolFeeBps") {
        return `Set the AMM protocol fee for new pools to ${(Number(args[0]) / 100).toFixed(2)}%`;
      }
      return `AMM call: ${functionName}`;
    } catch {
      return `AMM call (selector ${op.data.slice(0, 10)})`;
    }
  }
  if (target === LAUNCH_CHAIN.splitterAddress.toLowerCase()) {
    try {
      const { functionName } = decodeFunctionData({
        abi: feeSplitterAbi,
        data: op.data as `0x${string}`,
      });
      if (functionName === "setPayees") return "Change the platform fee splitter's payees";
      return `Splitter call: ${functionName}`;
    } catch {
      return `Splitter call (selector ${op.data.slice(0, 10)})`;
    }
  }
  return `Call to ${op.target}`;
}

function fmtWhen(unixSeconds: string): string {
  return new Date(Number(unixSeconds) * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
}

function fmtDelay(seconds: bigint): string {
  const s = Number(seconds);
  if (s >= 86400) return `${(s / 86400).toFixed(s % 86400 === 0 ? 0 : 1)} days`;
  if (s >= 3600) return `${(s / 3600).toFixed(s % 3600 === 0 ? 0 : 1)} hours`;
  return `${s} seconds`;
}

function Stat({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-1 break-all text-sm text-ink-100 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Term({
  label,
  value,
  ceiling,
  enforced,
}: {
  label: string;
  value: React.ReactNode;
  ceiling: string;
  enforced: string;
}) {
  return (
    <li className="rounded-xl border border-ink-700/60 bg-ink-950/50 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="text-sm font-medium text-ink-100">{label}</span>
        <span className="tabular text-sm text-ink-100">{value}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5 text-xs">
        <span className="text-ink-500">
          Ceiling: <span className="text-ink-300">{ceiling}</span>
        </span>
        <span className="text-ink-500">
          Enforced by: <span className="text-ink-300">{enforced}</span>
        </span>
      </div>
    </li>
  );
}

export default async function GovernancePage() {
  const [state, amm, ops] = await Promise.all([
    getFactoryState(),
    getAmmState(),
    getTimelockOperations(),
  ]);
  const explorer = LAUNCH_CHAIN.explorerUrl;
  const nowSec = Math.floor(Date.now() / 1000);

  return (
    <div className="container max-w-3xl py-14 md:py-20">
      <Link
        href="/launch"
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="h-4 w-4" /> Launchpad
      </Link>

      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-electric-300">
          Launchpad
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink-50">
          Fees &amp; governance
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-400">
          The factory&apos;s admin surface is owned by a timelock: every change is
          proposed publicly and can only execute after the delay below. The
          launch fee is capped by a constant no key can ever exceed.
        </p>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold tracking-tight text-ink-50">
        Economic terms
      </h2>
      <p className="mt-1 text-sm text-ink-400">
        Everything the platform charges — current value, ceiling, and what
        enforces it.
      </p>
      <ul className="mt-4 space-y-2">
        <Term
          label="Launch fee"
          value={
            state
              ? state.launchFee === 0n
                ? "Free"
                : `${formatEther(state.launchFee)} ETH`
              : "—"
          }
          ceiling={state ? `${formatEther(state.maxLaunchFee)} ETH` : "0.05 ETH"}
          enforced="MAX_LAUNCH_FEE constant; any change waits out the timelock"
        />
        <Term
          label="Token supply taken at launch"
          value="0 — 100% to the creator"
          ceiling="0, always"
          enforced="LaunchToken has no mint function after its locked initializer; the factory allocates everything to the creator (± their own vesting)"
        />
        <Term
          label="Cut of allocation sale proceeds"
          value="0"
          ceiling="0, always"
          enforced="AllocationSale has no fee path at all; proceeds go only to the creator's milestone-dated schedule"
        />
        <Term
          label="LP swap fee (all pools)"
          value="0.30%"
          ceiling="fixed"
          enforced="LP_FEE_BPS constant — goes to liquidity providers, never the platform"
        />
        <Term
          label="Protocol swap fee (opt-in pools only)"
          value={
            amm
              ? `${(amm.defaultProtocolFeeBps / 100).toFixed(2)}% of each swap total — of which ${((amm.defaultProtocolFeeBps * 0.7) / 100).toFixed(2)}% to the project, ${((amm.defaultProtocolFeeBps * 0.3) / 100).toFixed(2)}% to the platform`
              : "—"
          }
          ceiling={amm ? `${(amm.maxProtocolFeeBps / 100).toFixed(2)}% total` : "0.50% total"}
          enforced="MAX_PROTOCOL_FEE_BPS and the 70/30 PROJECT_SHARE_BPS split are constants"
        />
        <Term
          label="Changing an existing pool's fee"
          value="Never — frozen at pool creation"
          ceiling="—"
          enforced="the rate is written once into pool storage; the settable default applies only to pools created later"
        />
        <Term
          label="Any admin change"
          value={state ? `${fmtDelay(state.minDelay)} public delay` : "—"}
          ceiling="—"
          enforced="a TimelockController owns every knob (testnet delay; anything real gets 24h+)"
        />
      </ul>

      {state ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Stat
            label="Launch fee (now)"
            value={state.launchFee === 0n ? "Free" : `${formatEther(state.launchFee)} ETH`}
          />
          <Stat
            label="Hard fee ceiling (immutable)"
            value={`${formatEther(state.maxLaunchFee)} ETH — MAX_LAUNCH_FEE constant`}
          />
          <Stat label="Timelock delay on every change" value={fmtDelay(state.minDelay)} />
          <Stat label="Launches paused" value={state.paused ? "Yes" : "No"} />
          <Stat label="Treasury (withdrawal-only)" value={state.treasury} mono />
          <Stat label="Pause guardian (cannot unpause)" value={state.pauser} mono />
          <Stat
            label="Factory owner"
            value={
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-signal-400" />
                <span className="font-mono text-xs">{state.owner}</span>
                {state.owner.toLowerCase() === LAUNCH_CHAIN.timelockAddress.toLowerCase() ? (
                  <span className="text-signal-400">(the timelock)</span>
                ) : null}
              </span>
            }
          />
          <Stat
            label="Contracts"
            value={
              <span className="flex flex-col gap-1 font-mono text-xs">
                <a
                  className="text-electric-300 hover:text-electric-200"
                  href={`${explorer}/address/${LAUNCH_CHAIN.factoryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  factory {LAUNCH_CHAIN.factoryAddress.slice(0, 10)}…
                </a>
                <a
                  className="text-electric-300 hover:text-electric-200"
                  href={`${explorer}/address/${LAUNCH_CHAIN.timelockAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  timelock {LAUNCH_CHAIN.timelockAddress.slice(0, 10)}…
                </a>
              </span>
            }
          />
        </div>
      ) : (
        <StatusChip variant="block" tone="warning" className="mt-8 rounded-xl px-4 py-3 text-sm">
          Live chain reads are unavailable right now — the RPC could not be reached.
        </StatusChip>
      )}

      {amm ? (
        <>
          <h2 className="mt-10 font-display text-xl font-semibold tracking-tight text-ink-50">
            Trading (AMM)
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Stat
              label="Protocol fee for new opted-in pools"
              value={`${(amm.defaultProtocolFeeBps / 100).toFixed(2)}% — hard cap ${(amm.maxProtocolFeeBps / 100).toFixed(2)}% (constant)`}
            />
            <Stat
              label="Protocol fee split (constant)"
              value={`${amm.projectShareBps / 100}% to the project / ${(10_000 - amm.projectShareBps) / 100}% to the platform`}
            />
            <Stat
              label="AMM owner"
              value={
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs">{amm.ammOwner}</span>
                  {amm.ammOwner.toLowerCase() === LAUNCH_CHAIN.timelockAddress.toLowerCase() ? (
                    <span className="text-signal-400">(the timelock)</span>
                  ) : null}
                </span>
              }
            />
            <Stat
              label="Platform fee splitter"
              value={
                <span className="flex flex-col gap-1 text-xs">
                  <a
                    className="font-mono text-electric-300 hover:text-electric-200"
                    href={`${explorer}/address/${LAUNCH_CHAIN.splitterAddress}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {LAUNCH_CHAIN.splitterAddress}
                  </a>
                  {amm.splitterPayees.map((p, i) => (
                    <span key={p} className="font-mono text-ink-300">
                      {p.slice(0, 10)}… · {(amm.splitterShares[i] ?? 0) / 100}%
                    </span>
                  ))}
                </span>
              }
            />
          </div>
          <p className="mt-3 text-xs text-ink-500">
            LP fee is 0.30% on every pool. Protocol fees accrue only from real
            swap volume — nothing pays per-launch. Pool rates are frozen at
            creation; only the default for future pools can change, behind the
            timelock, never above the cap.
          </p>
        </>
      ) : null}

      <h2 className="mt-10 font-display text-xl font-semibold tracking-tight text-ink-50">
        Timelock operations
      </h2>
      <p className="mt-1 text-sm text-ink-400">
        Every admin action, past and pending, straight from the timelock&apos;s
        event log.
      </p>

      {ops === null ? (
        <p className="mt-4 text-sm text-ink-500">
          Indexer offline — operations can&apos;t be listed right now.
        </p>
      ) : ops.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">No operations scheduled yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {ops.map((op) => {
            const pendingReady = op.status === "pending" && Number(op.readyAt) <= nowSec;
            const badge: { label: string; tone: StatusTone } =
              op.status === "executed"
                ? { label: "Executed", tone: "success" }
                : op.status === "cancelled"
                  ? { label: "Cancelled", tone: "neutral" }
                  : pendingReady
                    ? { label: "Ready to execute", tone: "warning" }
                    : { label: `Executable ${fmtWhen(op.readyAt)} UTC`, tone: "info" };
            return (
              <li
                key={`${op.id}-${op.callIndex}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-700/60 bg-ink-950/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink-100">{describeCall(op)}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Scheduled {fmtWhen(op.scheduledAt)} UTC ·{" "}
                    <a
                      href={`${explorer}/tx/${op.executedTxHash ?? op.scheduledTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-electric-300 hover:text-electric-200"
                    >
                      transaction <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
                <StatusChip tone={badge.tone} className="px-2.5 py-0.5">
                  {badge.label}
                </StatusChip>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10 border-t border-ink-800/70 pt-6 text-xs leading-relaxed text-ink-500">
        The milestone escrow and journey updates contracts have no admin surface
        at all — no owner, no attester, no pause. There is nothing about them to
        govern, which is the point.
      </p>
    </div>
  );
}
