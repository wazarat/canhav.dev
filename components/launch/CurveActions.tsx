"use client";

import type { ProjectChain } from "@/lib/chains";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { erc20Abi, formatEther, parseEther } from "viem";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { launchChain, LAUNCH_CURVE, LAUNCH_CURVE_TAX_PCT } from "@/content/launch";
import { curveLauncherAbi } from "@/lib/abi/curveLauncher";
import { formatCount } from "@/lib/format";
import { writeWithGas } from "@/lib/tx";
import { cn } from "@/lib/utils";

import { friendlyCurveError } from "./curveErrors";
import { trimEth } from "./CurveProgress";
import { useLaunchChain } from "./useLaunchChain";

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string };

function parseEth(v: string): bigint | null {
  try {
    const n = parseEther(v.trim());
    return n > 0n ? n : null;
  } catch {
    return null;
  }
}

/**
 * Wallet side of a live bonding curve: buy with ETH and sell for ETH at the
 * launcher's own quotes, a slippage floor the user picks, and the snipe tax
 * window read live so the countdown is honest. Every write goes through
 * writeWithGas so the wallet gets a gas limit estimated on our RPC.
 */
export function CurveActions({
  chain,
  tokenAddress,
  symbol,
}: {
  /** The chain the token lives on (M54). */
  chain: ProjectChain;
  tokenAddress: string;
  symbol: string;
}) {
  const net = launchChain(chain);
  const router = useRouter();
  const { isConnected, address, ensureChain } = useLaunchChain(chain);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: net.chainId });

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [buyEth, setBuyEth] = useState("");
  const [sellTokens, setSellTokens] = useState("");
  const [slippage, setSlippage] = useState<number>(LAUNCH_CURVE.slippageOptions[1]);

  const token = tokenAddress as `0x${string}`;
  const buyWei = parseEth(buyEth);
  const sellWei = /^[0-9]+$/.test(sellTokens) && sellTokens !== "0" ? BigInt(sellTokens) * 10n ** 18n : null;

  const { data: progress } = useReadContract({
    chainId: net.chainId,
    abi: curveLauncherAbi,
    address: net.curveAddress,
    functionName: "progress",
    args: [token],
    query: { refetchInterval: 5_000 },
  });
  const { data: buyQuote } = useReadContract({
    chainId: net.chainId,
    abi: curveLauncherAbi,
    address: net.curveAddress,
    functionName: "quoteBuy",
    args: [token, buyWei ?? 0n],
    query: { enabled: buyWei !== null, refetchInterval: 5_000 },
  });
  const { data: sellQuote } = useReadContract({
    chainId: net.chainId,
    abi: curveLauncherAbi,
    address: net.curveAddress,
    functionName: "quoteSell",
    args: [token, sellWei ?? 0n],
    query: { enabled: sellWei !== null, refetchInterval: 5_000 },
  });

  const inWindow = progress ? progress[4] : false;
  const windowEnd = progress ? Number(progress[3]) : 0;
  const secondsLeft = Math.max(0, windowEnd - Math.floor(Date.now() / 1000));
  const floor = (out: bigint) => (out * BigInt(100 - slippage)) / 100n;

  async function run(label: string, fn: () => Promise<void>, what: string, needs: string) {
    if (status.kind === "working") return;
    try {
      setStatus({ kind: "working", label: "Checking network…" });
      if (!(await ensureChain())) throw new Error(`Switch to ${net.name} to continue.`);
      setStatus({ kind: "working", label });
      await fn();
    } catch (err) {
      console.error("curve action failed", err);
      setStatus({ kind: "error", message: friendlyCurveError(err, what, needs, net.name) });
    }
  }

  function gasClient() {
    if (!publicClient || !address) throw new Error("No RPC client.");
    return { publicClient, account: address };
  }

  async function waitAndRefresh(hash: `0x${string}`, doneMessage: string) {
    const { publicClient } = gasClient();
    setStatus({ kind: "working", label: "Waiting for confirmation…" });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted.");
    setStatus({ kind: "done", message: doneMessage });
    setTimeout(() => router.refresh(), 4000);
  }

  function buy() {
    void run(
      "Confirm the buy in your wallet…",
      async () => {
        if (buyWei === null) throw new Error("Enter a valid ETH amount.");
        if (!buyQuote) throw new Error("No quote yet. Wait a moment and retry.");
        const { publicClient, account } = gasClient();
        const hash = await writeWithGas(publicClient, account, writeContractAsync, {
          abi: curveLauncherAbi,
          address: net.curveAddress,
          functionName: "buy",
          args: [token, floor(buyQuote[0])],
          value: buyWei,
        });
        await waitAndRefresh(hash, "Bought on the curve.");
        setBuyEth("");
      },
      "the buy",
      "this buy",
    );
  }

  function sell() {
    void run(
      "Approve the tokens in your wallet…",
      async () => {
        if (sellWei === null) throw new Error("Enter a whole number of tokens.");
        if (sellQuote === undefined) throw new Error("No quote yet. Wait a moment and retry.");
        const { publicClient, account } = gasClient();
        const approveHash = await writeWithGas(publicClient, account, writeContractAsync, {
          abi: erc20Abi,
          address: token,
          functionName: "approve",
          args: [net.curveAddress, sellWei],
        });
        setStatus({ kind: "working", label: "Waiting for the approval…" });
        const approval = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approval.status !== "success") throw new Error("Approval reverted.");
        setStatus({ kind: "working", label: "Confirm the sell in your wallet…" });
        const hash = await writeWithGas(publicClient, account, writeContractAsync, {
          abi: curveLauncherAbi,
          address: net.curveAddress,
          functionName: "sell",
          args: [token, sellWei, floor(sellQuote)],
        });
        await waitAndRefresh(hash, "Sold back to the curve.");
        setSellTokens("");
      },
      "the sell",
      "gas",
    );
  }

  if (!isConnected) return null;

  return (
    <div className="mt-5 rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
      {inWindow ? (
        <StatusChip tone="warning" variant="block" className="mb-4">
          Snipe tax applies for {secondsLeft} more seconds. Buys now pay {LAUNCH_CURVE_TAX_PCT}% into
          the graduation pool.
        </StatusChip>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Field label={LAUNCH_CURVE.labels.buy} error={undefined}>
            <Input
              value={buyEth}
              placeholder="0.001"
              className="tabular"
              onChange={(e) => setBuyEth(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </Field>
          {buyWei !== null && buyQuote ? (
            <p className="text-xs text-ink-400">
              ≈ <span className="tabular text-ink-200">{formatCount(Number(buyQuote[0] / 10n ** 18n))}</span>{" "}
              {symbol}
              {buyQuote[1] > 0n ? ` after ${trimEth(buyQuote[1])} ETH tax` : ""}
              {buyQuote[3] > 0n
                ? `, ${trimEth(buyQuote[3])} ETH refunded beyond the threshold`
                : ""}
            </p>
          ) : null}
          <Button size="sm" disabled={status.kind === "working" || buyWei === null} onClick={buy}>
            Buy {symbol}
          </Button>
        </div>
        <div className="space-y-2">
          <Field label={LAUNCH_CURVE.labels.sell} error={undefined} hint="Whole tokens">
            <Input
              inputMode="numeric"
              value={sellTokens}
              placeholder="100"
              className="tabular"
              onChange={(e) => setSellTokens(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </Field>
          {sellWei !== null && sellQuote !== undefined ? (
            <p className="text-xs text-ink-400">
              ≈ <span className="tabular text-ink-200">{formatEther(sellQuote)}</span> ETH
            </p>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={status.kind === "working" || sellWei === null}
            onClick={sell}
          >
            Sell for ETH
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
        <span>{LAUNCH_CURVE.labels.slippage}</span>
        {LAUNCH_CURVE.slippageOptions.map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => setSlippage(pct)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 transition-colors",
              slippage === pct
                ? "border-electric-500/50 bg-electric-500/20 text-electric-200"
                : "border-ink-700/70 text-ink-400 hover:text-ink-200",
            )}
          >
            {pct}%
          </button>
        ))}
      </div>

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
