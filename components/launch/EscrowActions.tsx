"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { milestoneEscrowAbi } from "@/lib/abi/milestoneEscrow";
import { LAUNCH_CHAIN } from "@/content/launch";
import type { JourneyMilestone } from "@/lib/journey";

import { ConnectButton } from "./ConnectButton";
import { useLaunchChain } from "./useLaunchChain";

const erc20ApproveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export interface EscrowActionTranche {
  escrowId: string;
  trancheIndex: string;
  milestoneIndex: number;
  amount: string;
  unlockTime: string;
  claimed: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string };

/**
 * Wallet-side of the milestone escrow: claim buttons for unlocked tranches
 * (permissionless — funds always go to the creator) and, for the token's
 * creator, the lock-tokens flow (approve, then createEscrow).
 */
export function EscrowActions({
  tokenAddress,
  creator,
  journeyHash,
  symbol,
  milestones,
  tranches,
}: {
  tokenAddress: string;
  creator: string;
  journeyHash: string;
  symbol: string;
  milestones: JourneyMilestone[] | null;
  tranches: EscrowActionTranche[];
}) {
  const router = useRouter();
  const { isConnected, address, ensureChain } = useLaunchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [formOpen, setFormOpen] = useState(false);
  const [amounts, setAmounts] = useState<string[]>(() =>
    (milestones ?? []).map(() => ""),
  );
  const [dates, setDates] = useState<string[]>(() =>
    (milestones ?? []).map((m) => m.date),
  );

  const isCreator = !!address && address.toLowerCase() === creator.toLowerCase();
  const nowSec = Math.floor(Date.now() / 1000);
  const claimable = useMemo(
    () => tranches.filter((t) => !t.claimed && Number(t.unlockTime) <= nowSec),
    [tranches, nowSec],
  );

  async function run(label: string, fn: () => Promise<void>) {
    if (status.kind === "working") return;
    try {
      setStatus({ kind: "working", label: "Checking network…" });
      if (!(await ensureChain())) throw new Error(`Switch to ${LAUNCH_CHAIN.name} to continue.`);
      setStatus({ kind: "working", label });
      await fn();
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "Something went wrong.";
      setStatus({ kind: "error", message });
    }
  }

  async function waitAndRefresh(hash: `0x${string}`, doneMessage: string) {
    if (!publicClient) throw new Error("No RPC client.");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted.");
    setStatus({ kind: "done", message: doneMessage });
    // Give the indexer a beat to pick the event up, then re-render the page.
    setTimeout(() => router.refresh(), 4000);
  }

  function claim(t: EscrowActionTranche) {
    void run("Confirm the claim in your wallet…", async () => {
      const hash = await writeContractAsync({
        abi: milestoneEscrowAbi,
        address: LAUNCH_CHAIN.escrowAddress,
        functionName: "claim",
        args: [BigInt(t.escrowId), BigInt(t.trancheIndex)],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Tranche claimed — released to the creator.");
    });
  }

  function createEscrow() {
    if (!milestones) return;
    void run("Approve the escrow in your wallet…", async () => {
      const inputs = milestones
        .map((m, i) => ({ index: i, amount: amounts[i]?.trim() ?? "", date: dates[i] ?? m.date }))
        .filter((r) => r.amount !== "" && r.amount !== "0");
      if (inputs.length === 0) throw new Error("Enter an amount for at least one milestone.");
      for (const r of inputs) {
        if (!/^[0-9]+$/.test(r.amount)) throw new Error("Amounts must be whole token counts.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error("Unlock dates must be YYYY-MM-DD.");
      }

      const trancheArgs = inputs.map((r) => ({
        milestoneIndex: r.index,
        amount: BigInt(r.amount) * 10n ** 18n,
        unlockTime: BigInt(Math.floor(Date.parse(`${r.date}T00:00:00Z`) / 1000)),
      }));
      const total = trancheArgs.reduce((s, t) => s + t.amount, 0n);

      const approveHash = await writeContractAsync({
        abi: erc20ApproveAbi,
        address: tokenAddress as `0x${string}`,
        functionName: "approve",
        args: [LAUNCH_CHAIN.escrowAddress, total],
      });
      if (!publicClient) throw new Error("No RPC client.");
      setStatus({ kind: "working", label: "Waiting for the approval…" });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status !== "success") throw new Error("Approval reverted.");

      setStatus({ kind: "working", label: "Confirm the escrow in your wallet…" });
      const hash = await writeContractAsync({
        abi: milestoneEscrowAbi,
        address: LAUNCH_CHAIN.escrowAddress,
        functionName: "createEscrow",
        args: [tokenAddress as `0x${string}`, journeyHash as `0x${string}`, trancheArgs],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Tokens locked against your milestones.");
      setFormOpen(false);
    });
  }

  return (
    <div className="card-surface mt-4 rounded-2xl border border-ink-700/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-300">
          {isCreator
            ? "You created this token — lock supply against your milestones as a public commitment."
            : claimable.length > 0
              ? "Unlocked tranches can be claimed by anyone; tokens always go to the creator."
              : "Escrow actions"}
        </p>
        <ConnectButton />
      </div>

      {isConnected && claimable.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {claimable.map((t) => (
            <Button
              key={`${t.escrowId}-${t.trancheIndex}`}
              size="sm"
              disabled={status.kind === "working"}
              onClick={() => claim(t)}
            >
              Claim M{t.milestoneIndex + 1} tranche
            </Button>
          ))}
        </div>
      ) : null}

      {isCreator && milestones ? (
        <div className="mt-4 border-t border-ink-800/70 pt-4">
          {!formOpen ? (
            <Button size="sm" variant="ghost" onClick={() => setFormOpen(true)}>
              Lock tokens against milestones
            </Button>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_170px_150px]">
                  <p className="self-center text-xs text-ink-300">
                    <span className="font-mono text-ink-500">M{i + 1}</span> {m.title}
                  </p>
                  <Field label={`Amount (${symbol})`} error={undefined}>
                    <Input
                      inputMode="numeric"
                      value={amounts[i] ?? ""}
                      placeholder="0"
                      className="tabular"
                      onChange={(e) =>
                        setAmounts((prev) =>
                          prev.map((v, j) => (j === i ? e.target.value.replace(/[^0-9]/g, "") : v)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Unlocks" error={undefined}>
                    <Input
                      type="date"
                      value={dates[i] ?? m.date}
                      onChange={(e) =>
                        setDates((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                      }
                    />
                  </Field>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Button size="sm" disabled={status.kind === "working"} onClick={createEscrow}>
                  {status.kind === "working" ? "Locking…" : "Approve & lock"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-ink-500">
                Two transactions: an approval, then the escrow. Tranches unlock on
                their dates and can only ever be released to your address.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {status.kind === "working" ? (
        <p className="mt-3 text-xs text-ink-400">{status.label}</p>
      ) : null}
      {status.kind === "error" ? (
        <StatusChip variant="block" tone="error" className="mt-3">
          {status.message}
        </StatusChip>
      ) : null}
      {status.kind === "done" ? (
        <StatusChip variant="block" tone="success" className="mt-3">
          {status.message} Page refreshes in a few seconds.
        </StatusChip>
      ) : null}
    </div>
  );
}
