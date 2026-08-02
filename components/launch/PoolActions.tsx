"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { launchAmmAbi } from "@/lib/abi/launchAmm";
import { LAUNCH_CHAIN } from "@/content/launch";

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

export interface PoolActionPool {
  poolId: string;
  protocolFeeBps: number;
  ethReserve: string;
  tokenReserve: string;
  totalShares: string;
}

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done"; message: string };

const BPS = 10_000n;
const LP_FEE_BPS = 30n;

/**
 * Wallet side of the trading pool: swap in both directions (quotes mirror the
 * contract math, 1% slippage floor), add/remove liquidity, the creator's
 * create-pool flow with the protocol-fee opt-in, and fee claims.
 */
export function PoolActions({
  tokenAddress,
  creator,
  symbol,
  pool,
}: {
  tokenAddress: string;
  creator: string;
  symbol: string;
  pool: PoolActionPool | null;
}) {
  const router = useRouter();
  const { isConnected, address, ensureChain } = useLaunchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [buyEth, setBuyEth] = useState("");
  const [sellTokens, setSellTokens] = useState("");
  const [lpEth, setLpEth] = useState("");
  const [lpTokens, setLpTokens] = useState("");
  const [removePercent, setRemovePercent] = useState("50");
  const [optIn, setOptIn] = useState(true);

  const isCreator = !!address && address.toLowerCase() === creator.toLowerCase();
  const poolId = pool ? BigInt(pool.poolId) : null;
  const ethReserve = pool ? BigInt(pool.ethReserve) : 0n;
  const tokenReserve = pool ? BigInt(pool.tokenReserve) : 0n;
  const hasLiquidity = pool !== null && BigInt(pool.totalShares) > 0n;

  const { data: myShares } = useReadContract({
    abi: launchAmmAbi,
    address: LAUNCH_CHAIN.ammAddress,
    functionName: "sharesOf",
    args: poolId !== null && address ? [poolId, address] : undefined,
    query: { enabled: poolId !== null && !!address },
  });
  const { data: myAccruedEth } = useReadContract({
    abi: launchAmmAbi,
    address: LAUNCH_CHAIN.ammAddress,
    functionName: "accruedEth",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: myAccruedTokens } = useReadContract({
    abi: launchAmmAbi,
    address: LAUNCH_CHAIN.ammAddress,
    functionName: "accruedTokens",
    args: address ? [tokenAddress as `0x${string}`, address] : undefined,
    query: { enabled: !!address },
  });
  const { data: defaultFeeBps } = useReadContract({
    abi: launchAmmAbi,
    address: LAUNCH_CHAIN.ammAddress,
    functionName: "defaultProtocolFeeBps",
    query: { enabled: !pool && isCreator },
  });

  function quote(amountIn: bigint, reserveIn: bigint, reserveOut: bigint, feeBps: number): bigint {
    if (reserveIn === 0n || reserveOut === 0n || amountIn === 0n) return 0n;
    const inNet = amountIn - (amountIn * BigInt(feeBps)) / BPS;
    const inAfterLp = (inNet * (BPS - LP_FEE_BPS)) / BPS;
    return (reserveOut * inAfterLp) / (reserveIn + inAfterLp);
  }

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

  async function approveIfNeeded(amount: bigint) {
    const hash = await writeContractAsync({
      abi: erc20ApproveAbi,
      address: tokenAddress as `0x${string}`,
      functionName: "approve",
      args: [LAUNCH_CHAIN.ammAddress, amount],
    });
    if (!publicClient) throw new Error("No RPC client.");
    setStatus({ kind: "working", label: "Waiting for the approval…" });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Approval reverted.");
  }

  function createPool() {
    void run("Confirm pool creation in your wallet…", async () => {
      const hash = await writeContractAsync({
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "createPool",
        args: [tokenAddress as `0x${string}`, optIn],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Pool created — add the first liquidity to open trading.");
    });
  }

  function swapBuy() {
    if (poolId === null) return;
    void run("Confirm the swap in your wallet…", async () => {
      let value: bigint;
      try {
        value = parseEther(buyEth.trim());
      } catch {
        throw new Error("Enter a valid ETH amount.");
      }
      if (value <= 0n) throw new Error("Enter a valid ETH amount.");
      const q = quote(value, ethReserve, tokenReserve, pool!.protocolFeeBps);
      const hash = await writeContractAsync({
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "swapEthForTokens",
        args: [poolId, (q * 99n) / 100n],
        value,
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Swap complete.");
      setBuyEth("");
    });
  }

  function swapSell() {
    if (poolId === null) return;
    void run("Approve the tokens in your wallet…", async () => {
      if (!/^[0-9]+$/.test(sellTokens) || sellTokens === "0")
        throw new Error("Enter a whole number of tokens.");
      const amountIn = BigInt(sellTokens) * 10n ** 18n;
      await approveIfNeeded(amountIn);
      const q = quote(amountIn, tokenReserve, ethReserve, pool!.protocolFeeBps);
      setStatus({ kind: "working", label: "Confirm the swap in your wallet…" });
      const hash = await writeContractAsync({
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "swapTokensForEth",
        args: [poolId, amountIn, (q * 99n) / 100n],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Swap complete.");
      setSellTokens("");
    });
  }

  function addLiquidity() {
    if (poolId === null) return;
    void run("Approve the tokens in your wallet…", async () => {
      let ethIn: bigint;
      try {
        ethIn = parseEther(lpEth.trim());
      } catch {
        throw new Error("Enter a valid ETH amount.");
      }
      if (ethIn <= 0n) throw new Error("Enter a valid ETH amount.");

      let tokenMax: bigint;
      if (hasLiquidity && ethReserve > 0n) {
        tokenMax = (ethIn * tokenReserve + ethReserve - 1n) / ethReserve;
      } else {
        if (!/^[0-9]+$/.test(lpTokens) || lpTokens === "0")
          throw new Error("First add sets the price — enter the token amount too.");
        tokenMax = BigInt(lpTokens) * 10n ** 18n;
      }

      await approveIfNeeded(tokenMax);
      setStatus({ kind: "working", label: "Confirm the deposit in your wallet…" });
      const hash = await writeContractAsync({
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "addLiquidity",
        args: [poolId, tokenMax],
        value: ethIn,
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Liquidity added.");
      setLpEth("");
      setLpTokens("");
    });
  }

  function removeLiquidity() {
    if (poolId === null || !myShares) return;
    void run("Confirm the withdrawal in your wallet…", async () => {
      const pct = Number(removePercent);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100)
        throw new Error("Percent must be 1–100.");
      const burn = (myShares * BigInt(pct)) / 100n;
      if (burn === 0n) throw new Error("Nothing to withdraw.");
      const total = BigInt(pool!.totalShares);
      const minEth = (((burn * ethReserve) / total) * 99n) / 100n;
      const minTok = (((burn * tokenReserve) / total) * 99n) / 100n;
      const hash = await writeContractAsync({
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "removeLiquidity",
        args: [poolId, burn, minEth, minTok],
      });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Liquidity withdrawn.");
    });
  }

  function claim(kind: "eth" | "tokens") {
    if (!address) return;
    void run("Confirm the claim in your wallet…", async () => {
      const hash =
        kind === "eth"
          ? await writeContractAsync({
              abi: launchAmmAbi,
              address: LAUNCH_CHAIN.ammAddress,
              functionName: "claimEth",
              args: [address],
            })
          : await writeContractAsync({
              abi: launchAmmAbi,
              address: LAUNCH_CHAIN.ammAddress,
              functionName: "claimTokens",
              args: [tokenAddress as `0x${string}`, address],
            });
      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      await waitAndRefresh(hash, "Fees claimed.");
    });
  }

  if (!isConnected) return null;
  if (!pool && !isCreator) return null;

  const buyQuote =
    pool && buyEth && hasLiquidity
      ? (() => {
          try {
            return quote(parseEther(buyEth.trim()), ethReserve, tokenReserve, pool.protocolFeeBps);
          } catch {
            return 0n;
          }
        })()
      : 0n;

  return (
    <div className="card-surface mt-4 rounded-2xl border border-ink-700/70 p-5">
      {!pool && isCreator ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-300">
            Open a trading pool for your token. Liquidity is anyone&apos;s to
            add; the first deposit sets the price.
          </p>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-200">
            <input
              type="checkbox"
              checked={optIn}
              onChange={(e) => setOptIn(e.target.checked)}
              className="h-4 w-4 accent-electric-500"
            />
            <span>
              {defaultFeeBps !== undefined
                ? `Opt in to the protocol fee: ${(Number(defaultFeeBps) / 100).toFixed(2)}% of each swap in total — ${((Number(defaultFeeBps) * 0.7) / 100).toFixed(2)}% to you, ${((Number(defaultFeeBps) * 0.3) / 100).toFixed(2)}% to the platform. The 70/30 split is fixed in bytecode, the total is hard-capped at 0.50%, and your pool's rate is frozen at creation forever.`
                : "Opt in to the protocol fee — split 70/30 in your favour (bytecode constant), total hard-capped at 0.50%, and frozen at creation forever."}
            </span>
          </label>
          <Button size="sm" disabled={status.kind === "working"} onClick={createPool}>
            {status.kind === "working" ? "Creating…" : "Create pool"}
          </Button>
        </div>
      ) : null}

      {pool && hasLiquidity ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Field label="Buy with ETH" error={undefined}>
              <Input
                value={buyEth}
                placeholder="0.001"
                className="tabular"
                onChange={(e) => setBuyEth(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </Field>
            {buyQuote > 0n ? (
              <p className="text-xs text-ink-400">
                ≈ <span className="tabular text-ink-200">{formatEther(buyQuote)}</span> {symbol}
              </p>
            ) : null}
            <Button size="sm" disabled={status.kind === "working"} onClick={swapBuy}>
              Buy {symbol}
            </Button>
          </div>
          <div className="space-y-2">
            <Field label={`Sell ${symbol}`} error={undefined} hint="Whole tokens">
              <Input
                inputMode="numeric"
                value={sellTokens}
                placeholder="100"
                className="tabular"
                onChange={(e) => setSellTokens(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>
            <Button size="sm" variant="ghost" disabled={status.kind === "working"} onClick={swapSell}>
              Sell for ETH
            </Button>
          </div>
        </div>
      ) : null}

      {pool ? (
        <div className={hasLiquidity ? "mt-4 border-t border-ink-800/70 pt-4" : ""}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Field
                label="Add liquidity (ETH)"
                error={undefined}
                hint={hasLiquidity ? "Token side is matched automatically" : "First deposit sets the price"}
              >
                <Input
                  value={lpEth}
                  placeholder="0.001"
                  className="tabular"
                  onChange={(e) => setLpEth(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </Field>
              {!hasLiquidity ? (
                <Field label={`…and ${symbol}`} error={undefined} hint="Whole tokens">
                  <Input
                    inputMode="numeric"
                    value={lpTokens}
                    placeholder="100000"
                    className="tabular"
                    onChange={(e) => setLpTokens(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </Field>
              ) : null}
              <Button size="sm" variant="ghost" disabled={status.kind === "working"} onClick={addLiquidity}>
                Add liquidity
              </Button>
            </div>
            {myShares && myShares > 0n ? (
              <div className="space-y-2">
                <Field label="Withdraw liquidity (%)" error={undefined}>
                  <Input
                    inputMode="numeric"
                    value={removePercent}
                    className="tabular"
                    onChange={(e) => setRemovePercent(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </Field>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={status.kind === "working"}
                  onClick={removeLiquidity}
                >
                  Withdraw
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {(myAccruedEth && myAccruedEth > 0n) || (myAccruedTokens && myAccruedTokens > 0n) ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-800/70 pt-4">
          {myAccruedEth && myAccruedEth > 0n ? (
            <Button size="sm" disabled={status.kind === "working"} onClick={() => claim("eth")}>
              Claim {formatEther(myAccruedEth)} ETH in fees
            </Button>
          ) : null}
          {myAccruedTokens && myAccruedTokens > 0n ? (
            <Button size="sm" disabled={status.kind === "working"} onClick={() => claim("tokens")}>
              Claim token fees
            </Button>
          ) : null}
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
