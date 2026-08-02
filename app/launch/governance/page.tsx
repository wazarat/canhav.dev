import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { decodeFunctionData, formatEther } from "viem";

import { LAUNCH_CHAIN } from "@/content/launch";
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
  if (op.target.toLowerCase() !== LAUNCH_CHAIN.factoryAddress.toLowerCase()) {
    return `Call to ${op.target}`;
  }
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

export default async function GovernancePage() {
  const [state, ops] = await Promise.all([getFactoryState(), getTimelockOperations()]);
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
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-xs">{state.owner}</span>
                {state.owner.toLowerCase() === LAUNCH_CHAIN.timelockAddress.toLowerCase() ? (
                  <span className="text-emerald-300">(the timelock)</span>
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
        <p className="mt-8 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Live chain reads are unavailable right now — the RPC could not be reached.
        </p>
      )}

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
            const badge =
              op.status === "executed"
                ? { label: "Executed", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" }
                : op.status === "cancelled"
                  ? { label: "Cancelled", cls: "border-ink-700/70 bg-ink-900/60 text-ink-400" }
                  : pendingReady
                    ? { label: "Ready to execute", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" }
                    : { label: `Executable ${fmtWhen(op.readyAt)} UTC`, cls: "border-electric-500/40 bg-electric-500/10 text-electric-200" };
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
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${badge.cls}`}
                >
                  {badge.label}
                </span>
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
