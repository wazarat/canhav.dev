"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { allocationSaleAbi } from "@/lib/abi/allocationSale";
import { LAUNCH_CHAIN } from "@/content/launch";
import type { JourneyMilestone } from "@/lib/journey";

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

export interface SaleActionSale {
  saleId: string;
  price: string;
  allocation: string;
  sold: string;
  startTime: string;
  endTime: string;
  unsoldReclaimed: boolean;
  tranches: { trancheIndex: string; unlockTime: string; claimed: boolean }[];
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string };

/**
 * Wallet side of allocation sales: the buy widget (whole-token amounts keep
 * payments exact — the contract rejects dust), the creator's create-sale
 * flow, and permissionless claim/reclaim buttons once a sale has ended.
 */
export function SaleActions({
  tokenAddress,
  creator,
  journeyHash,
  symbol,
  milestones,
  sales,
}: {
  tokenAddress: string;
  creator: string;
  journeyHash: string;
  symbol: string;
  milestones: JourneyMilestone[] | null;
  sales: SaleActionSale[];
}) {
  const router = useRouter();
  const { isConnected, address, ensureChain } = useLaunchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [buyAmount, setBuyAmount] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [priceEth, setPriceEth] = useState("0.0001");
  const [allocation, setAllocation] = useState("");
  const [endDate, setEndDate] = useState(() =>
    new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
  );
  const [walletCap, setWalletCap] = useState("");
  const [percents, setPercents] = useState<string[]>(() => {
    const n = milestones?.length ?? 0;
    if (n === 0) return [];
    const base = Math.floor(100 / n);
    return Array.from({ length: n }, (_, i) => String(i === n - 1 ? 100 - base * (n - 1) : base));
  });
  const [unlockDates, setUnlockDates] = useState<string[]>(() =>
    (milestones ?? []).map((m) => m.date),
  );

  const isCreator = !!address && address.toLowerCase() === creator.toLowerCase();
  const nowSec = Math.floor(Date.now() / 1000);
  const liveSale = sales.find(
    (s) => Number(s.startTime) <= nowSec && nowSec < Number(s.endTime),
  );
  const endedSales = sales.filter((s) => nowSec >= Number(s.endTime));

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
    setTimeout(() => router.refresh(), 4000);
  }

  function buy() {
    if (!liveSale) return;
    void run("Confirm the purchase in your wallet…", async () => {
      if (!/^[0-9]+$/.test(buyAmount) || buyAmount === "0") {
        throw new Error("Enter a whole number of tokens to buy.");
      }
      // Whole-token amounts make the cost exact: cost = N * price.
      const cost = BigInt(buyAmount) * BigInt(liveSale.price);
      const hash = await writeContractAsync({
        abi: allocationSaleAbi,
        address: LAUNCH_CHAIN.saleAddress,
        functionName: "buy",
        args: [BigInt(liveSale.saleId)],
        value: cost,
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, `Bought ${buyAmount} ${symbol}.`);
      setBuyAmount("");
    });
  }

  function createSale() {
    if (!milestones) return;
    void run("Approve the sale allocation in your wallet…", async () => {
      let price: bigint;
      try {
        price = parseEther(priceEth.trim());
      } catch {
        throw new Error("Price must be a valid ETH amount.");
      }
      if (price <= 0n) throw new Error("Price must be positive.");
      if (!/^[0-9]+$/.test(allocation) || allocation === "0")
        throw new Error("Allocation must be a whole token count.");
      if (walletCap !== "" && !/^[0-9]+$/.test(walletCap))
        throw new Error("Per-wallet cap must be a whole token count (or empty).");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("End date must be YYYY-MM-DD.");
      const end = Math.floor(Date.parse(`${endDate}T00:00:00Z`) / 1000);
      if (end <= nowSec) throw new Error("End date must be in the future.");

      const rows = milestones
        .map((m, i) => ({
          index: i,
          percent: percents[i]?.trim() ?? "",
          date: unlockDates[i] ?? m.date,
        }))
        .filter((r) => r.percent !== "" && r.percent !== "0");
      if (rows.length === 0) throw new Error("Give at least one milestone a proceeds share.");
      let bpsSum = 0;
      const trancheArgs = rows.map((r) => {
        if (!/^[0-9]+$/.test(r.percent)) throw new Error("Shares must be whole percents.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) throw new Error("Unlock dates must be YYYY-MM-DD.");
        const bps = Number(r.percent) * 100;
        bpsSum += bps;
        return {
          milestoneIndex: r.index,
          bps,
          unlockTime: BigInt(Math.floor(Date.parse(`${r.date}T00:00:00Z`) / 1000)),
        };
      });
      if (bpsSum !== 10_000) throw new Error("Proceeds shares must sum to exactly 100%.");

      const allocationWei = BigInt(allocation) * 10n ** 18n;
      const capWei = walletCap === "" ? 0n : BigInt(walletCap) * 10n ** 18n;

      const approveHash = await writeContractAsync({
        abi: erc20ApproveAbi,
        address: tokenAddress as `0x${string}`,
        functionName: "approve",
        args: [LAUNCH_CHAIN.saleAddress, allocationWei],
      });
      if (!publicClient) throw new Error("No RPC client.");
      setStatus({ kind: "working", label: "Waiting for the approval…" });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status !== "success") throw new Error("Approval reverted.");

      setStatus({ kind: "working", label: "Confirm the sale in your wallet…" });
      const hash = await writeContractAsync({
        abi: allocationSaleAbi,
        address: LAUNCH_CHAIN.saleAddress,
        functionName: "createSale",
        args: [
          tokenAddress as `0x${string}`,
          journeyHash as `0x${string}`,
          price,
          allocationWei,
          0n, // start now
          BigInt(end),
          capWei,
          trancheArgs,
        ],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Sale is live.");
      setFormOpen(false);
    });
  }

  function claimTranche(saleId: string, trancheIndex: string) {
    void run("Confirm the claim in your wallet…", async () => {
      const hash = await writeContractAsync({
        abi: allocationSaleAbi,
        address: LAUNCH_CHAIN.saleAddress,
        functionName: "claimProceeds",
        args: [BigInt(saleId), BigInt(trancheIndex)],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Proceeds tranche released to the creator.");
    });
  }

  function reclaim(saleId: string) {
    void run("Confirm the reclaim in your wallet…", async () => {
      const hash = await writeContractAsync({
        abi: allocationSaleAbi,
        address: LAUNCH_CHAIN.saleAddress,
        functionName: "reclaimUnsold",
        args: [BigInt(saleId)],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Unsold allocation returned to the creator.");
    });
  }

  const claimables = endedSales.flatMap((s) =>
    s.tranches
      .filter((t) => !t.claimed && Number(t.unlockTime) <= nowSec)
      .map((t) => ({ saleId: s.saleId, trancheIndex: t.trancheIndex })),
  );
  const reclaimables = endedSales.filter((s) => {
    const soldOut = BigInt(s.sold) >= BigInt(s.allocation);
    return !s.unsoldReclaimed && !soldOut;
  });

  if (!isConnected) return null;

  const hasAnything =
    !!liveSale || isCreator || claimables.length > 0 || reclaimables.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="card-surface mt-4 rounded-2xl border border-ink-700/70 p-5">
      {liveSale ? (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={`Buy ${symbol}`} error={undefined} hint="Whole tokens — payment is exact">
            <Input
              inputMode="numeric"
              value={buyAmount}
              placeholder="100"
              className="tabular"
              onChange={(e) => setBuyAmount(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
          <div className="pb-1">
            <Button size="sm" disabled={status.kind === "working"} onClick={buy}>
              {status.kind === "working" ? "Buying…" : "Buy"}
            </Button>
          </div>
          {/^[0-9]+$/.test(buyAmount) && buyAmount !== "0" ? (
            <p className="pb-2 text-xs text-ink-400">
              Costs exactly{" "}
              <span className="tabular text-ink-200">
                {formatEther(BigInt(buyAmount) * BigInt(liveSale.price))} ETH
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {claimables.length > 0 || reclaimables.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {claimables.map((c) => (
            <Button
              key={`${c.saleId}-${c.trancheIndex}`}
              size="sm"
              variant="ghost"
              disabled={status.kind === "working"}
              onClick={() => claimTranche(c.saleId, c.trancheIndex)}
            >
              Release proceeds tranche {Number(c.trancheIndex) + 1}
            </Button>
          ))}
          {reclaimables.map((s) => (
            <Button
              key={s.saleId}
              size="sm"
              variant="ghost"
              disabled={status.kind === "working"}
              onClick={() => reclaim(s.saleId)}
            >
              Return unsold to creator
            </Button>
          ))}
        </div>
      ) : null}

      {isCreator && milestones ? (
        <div className={liveSale || claimables.length > 0 ? "mt-4 border-t border-ink-800/70 pt-4" : ""}>
          {!formOpen ? (
            <Button size="sm" variant="ghost" onClick={() => setFormOpen(true)}>
              Sell an allocation
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Price (ETH/token)" error={undefined}>
                  <Input
                    value={priceEth}
                    className="tabular"
                    onChange={(e) => setPriceEth(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </Field>
                <Field label={`Allocation (${symbol})`} error={undefined}>
                  <Input
                    inputMode="numeric"
                    value={allocation}
                    placeholder="100000"
                    className="tabular"
                    onChange={(e) => setAllocation(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </Field>
                <Field label="Ends" error={undefined}>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </Field>
                <Field label="Wallet cap" error={undefined} hint="tokens; empty = none">
                  <Input
                    inputMode="numeric"
                    value={walletCap}
                    placeholder="—"
                    className="tabular"
                    onChange={(e) => setWalletCap(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </Field>
              </div>

              <p className="text-xs text-ink-500">
                Proceeds schedule — shares must sum to 100%; each unlocks on its
                date, after the sale ends. You cannot withdraw outside this
                schedule.
              </p>
              {milestones.map((m, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_130px_150px]">
                  <p className="self-center text-xs text-ink-300">
                    <span className="font-mono text-ink-500">M{i + 1}</span> {m.title}
                  </p>
                  <Field label="Share %" error={undefined}>
                    <Input
                      inputMode="numeric"
                      value={percents[i] ?? ""}
                      className="tabular"
                      onChange={(e) =>
                        setPercents((prev) =>
                          prev.map((v, j) => (j === i ? e.target.value.replace(/[^0-9]/g, "") : v)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Unlocks" error={undefined}>
                    <Input
                      type="date"
                      value={unlockDates[i] ?? m.date}
                      onChange={(e) =>
                        setUnlockDates((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                      }
                    />
                  </Field>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Button size="sm" disabled={status.kind === "working"} onClick={createSale}>
                  {status.kind === "working" ? "Creating…" : "Approve & create sale"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {status.kind === "working" ? (
        <p className="mt-3 text-xs text-ink-400">{status.label}</p>
      ) : null}
      {status.kind === "error" ? (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {status.message}
        </p>
      ) : null}
      {status.kind === "done" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {status.message} Page refreshes in a few seconds.
        </p>
      ) : null}
    </div>
  );
}
