"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { decodeEventLog, erc20Abi, formatEther, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input, TextArea, inputClasses } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { cn } from "@/lib/utils";
import { launchAmmAbi } from "@/lib/abi/launchAmm";
import { tokenFactoryAbi } from "@/lib/abi/tokenFactory";
import { formatPriceEth } from "@/lib/format";
import {
  hashDescription,
  hashJourney,
  validateJourney,
  ZERO_JOURNEY_HASH,
  type JourneyDoc,
  type JourneyMilestone,
} from "@/lib/journey";
import { describeTxError, preflightWrite, writeWithGas, type TxParams } from "@/lib/tx";
import {
  LAUNCH_CHAIN,
  LAUNCH_DEV_BUY,
  LAUNCH_FORM,
  LAUNCH_POOL,
  LAUNCH_POOL_SHARE_PCT,
  LAUNCH_SUPPLY,
  normalizeTelegram,
  normalizeXHandle,
  validateDescription,
  validateDevBuy,
  validateName,
  validateTelegram,
  validateTicker,
  validateWebsite,
  validateXHandle,
} from "@/content/launch";

import { AccountLink } from "./AccountLink";
import { ConnectButton } from "./ConnectButton";
import { ImagePicker } from "./ImagePicker";
import { JourneyFields } from "./JourneyFields";
import { McpConnectCard } from "./McpConnectCard";
import { TokenPreviewCard } from "./TokenPreviewCard";
import { useLaunchChain } from "./useLaunchChain";

type ImageState = { file: File; previewUrl: string } | null;
type Step = 1 | 2;

type PoolStep = "createPool" | "approve" | "addLiquidity";

/**
 * What happened to the pool after the token launched. The token is live
 * before any of this runs, so a pool failure is reported beside the token
 * address, never instead of it.
 */
type PoolOutcome =
  | { kind: "skipped" }
  | { kind: "seeded"; poolId: bigint; ethWei: bigint; tokensWei: bigint; txHash: string }
  | {
      kind: "failed";
      failedAt: PoolStep;
      cause: "rejected" | "failed";
      message: string;
      /** Known once createPool confirmed; the token page can finish from here. */
      poolId?: bigint;
    };

type FlowStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string; step?: number; total?: number }
  | { kind: "error"; message: string }
  | { kind: "success"; token: string; txHash: string; pool: PoolOutcome };

function randomSalt(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Rough gas allowance per transaction on top of the launch fee for the preflight check. */
const GAS_BUFFER_WEI = 500_000_000_000_000n; // 0.0005 ETH

const fmtEth = (wei: bigint) =>
  `${Number(formatEther(wei)).toLocaleString("en-US", { maximumFractionDigits: 6 })} ETH`;

/** Factory custom errors in plain language. */
const KNOWN_FACTORY_ERRORS: Record<string, string> = {
  WrongLaunchFee:
    "The transaction sent the wrong launch fee. The fee may have changed since the page loaded; reload so it re-reads from the factory, then retry.",
  EnforcedPause:
    "This factory is currently paused. Reload the page to pick up the active factory, or try again later.",
  VestingAmountExceedsSupply:
    "The vesting amount exceeds the total supply. Lower the vested percent.",
  VestingDurationZero:
    "Vesting is on but the duration is zero. Set a duration or turn vesting off.",
  ZeroSupply: "Total supply must be at least 1.",
  EmptyName: "The token name is empty.",
  EmptySymbol: "The ticker is empty.",
};

/** LaunchAMM custom errors the seeding steps can hit, in plain language. */
const KNOWN_AMM_ERRORS: Record<string, string> = {
  PoolExists: "A pool for this token already exists.",
  InsufficientInitialLiquidity: "The developer buy is too small to open the pool.",
  ZeroAmount: "The pool deposit amount was zero.",
  UnknownPool: "The pool could not be found after it was created.",
  SafeERC20FailedOperation: "The token transfer into the pool failed.",
};

const REJECTED_COPY = "The wallet rejected the request. Nothing was sent.";

function walletInternalCopy(detail: string): string {
  return `Your wallet could not prepare the transaction. ${detail.replace(/\.$/, "")}. Retry, and if it repeats update the wallet extension.`;
}

function friendlyLaunchError(err: unknown): string {
  const d = describeTxError(err);
  switch (d.kind) {
    case "revert": {
      if (d.errorName && KNOWN_FACTORY_ERRORS[d.errorName]) return KNOWN_FACTORY_ERRORS[d.errorName];
      const what = d.errorName ?? d.reason;
      return what ? `The factory rejected the launch (${what}).` : "The factory rejected the launch.";
    }
    case "rejected":
      return REJECTED_COPY;
    case "insufficientFunds":
      return `Not enough ETH in this wallet to cover the launch fee plus gas. Fund it on ${LAUNCH_CHAIN.name} and retry.`;
    case "walletInternal":
      return walletInternalCopy(d.detail);
    case "other":
      return d.detail;
  }
}

function friendlyPoolError(err: unknown): string {
  const d = describeTxError(err);
  switch (d.kind) {
    case "revert": {
      if (d.errorName && KNOWN_AMM_ERRORS[d.errorName]) return KNOWN_AMM_ERRORS[d.errorName];
      const what = d.errorName ?? d.reason;
      return what ? `The pool contract rejected the step (${what}).` : "The pool contract rejected the step.";
    }
    case "rejected":
      return REJECTED_COPY;
    case "insufficientFunds":
      return "Not enough ETH left in this wallet for the pool deposit plus gas.";
    case "walletInternal":
      return walletInternalCopy(d.detail);
    case "other":
      return d.detail;
  }
}

/** Values seeded from a published token design (?design=<id>). */
export interface LaunchPrefill {
  name: string;
  ticker: string;
  /** The design document's committed total. Absent for a ground-up launch. */
  supply?: string;
  /** True when the design declares vesting cohorts the launch cannot apply. */
  designVesting?: boolean;
}

/**
 * A published design to commit on-chain: journeyHash carries the design's
 * snapshot hash instead of a v1 journey hash, so the launch permanently
 * commits to the ideation behind it. Which table the hash resolves in
 * (journeys vs ideation_snapshots) is how the two paths are told apart.
 */
export interface DesignCommitment {
  id: string;
  slug: string;
  snapshotHash: `0x${string}`;
  name: string;
}

export function LaunchForm({
  prefill,
  designCommitment,
}: {
  prefill?: LaunchPrefill;
  designCommitment?: DesignCommitment;
} = {}) {
  // Step 1 — token details
  const [name, setName] = useState(prefill?.name ?? "");
  const [ticker, setTicker] = useState(prefill?.ticker ?? "");
  const [description, setDescription] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState<string | undefined>(undefined);
  const [image, setImage] = useState<ImageState>(null);
  const [devBuyEth, setDevBuyEth] = useState("");

  // Step 2 — journey
  const [why, setWhy] = useState("");
  const [supplyRationale, setSupplyRationale] = useState("");
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([
    { date: "", title: "", description: "" },
    { date: "", title: "", description: "" },
  ]);

  // Flow
  const [step, setStep] = useState<Step>(1);
  const [commitmentOn, setCommitmentOn] = useState(false);
  const [status, setStatus] = useState<FlowStatus>({ kind: "idle" });

  const { isConnected, address, ensureChain } = useLaunchChain();
  const { connector } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Launch fee is read live from the factory (settable only through the
  // timelock, hard-capped by MAX_LAUNCH_FEE). Shown on the review step and
  // sent as the exact tx value — the factory requires strict equality.
  const { data: launchFee } = useReadContract({
    abi: tokenFactoryAbi,
    address: LAUNCH_CHAIN.factoryAddress,
    functionName: "launchFee",
  });
  const { data: balance } = useBalance({
    address,
    chainId: LAUNCH_CHAIN.chainId,
    query: { enabled: Boolean(address) },
  });

  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = image?.previewUrl ?? null;
  }, [image]);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function selectImage(file: File) {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  }

  function clearImage() {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  const nameError = validateName(name);
  const tickerError = validateTicker(ticker);
  const descriptionError = validateDescription(description);
  const xHandleError = validateXHandle(xHandle);
  const telegramError = validateTelegram(telegram);
  // Supply is not asked for. A ground-up launch mints LAUNCH_SUPPLY; a launch
  // started from a published design keeps that document's total, because the
  // number sits inside the snapshot hash going on-chain.
  const totalSupply = prefill?.supply ? Number(prefill.supply) : LAUNCH_SUPPLY;
  const totalSupplyWei = BigInt(totalSupply) * 10n ** 18n;

  // Developer buy. The ETH seeds the creator's pool right after launch,
  // paired with a fixed share of the supply. 0n means no pool step.
  const devBuyFormatError = validateDevBuy(devBuyEth);
  const devBuyWei = !devBuyEth || devBuyFormatError ? 0n : parseEther(devBuyEth);
  const tokensForPool = (totalSupplyWei * BigInt(LAUNCH_POOL.supplyShareBps)) / 10_000n;
  const txCount = devBuyWei > 0n ? BigInt(LAUNCH_POOL.steps.length) : 1n;
  const neededWei =
    launchFee === undefined ? undefined : launchFee + devBuyWei + GAS_BUFFER_WEI * txCount;
  // Only once both the balance and the fee are known, so the Continue button
  // does not flicker disabled on first paint.
  const devBuyBalanceError =
    !devBuyFormatError && devBuyWei > 0n && balance && neededWei !== undefined && balance.value < neededWei
      ? "More than this wallet can cover after the launch fee and gas."
      : undefined;
  const devBuyError = devBuyFormatError ?? devBuyBalanceError;
  const openingPrice = devBuyWei > 0n ? formatPriceEth(devBuyWei, tokensForPool) : null;
  const balanceLine = balance
    ? `${LAUNCH_DEV_BUY.balanceLabel} ${fmtEth(balance.value)}`
    : LAUNCH_DEV_BUY.balanceUnavailable;

  const step1Valid =
    name.trim().length > 0 &&
    ticker.length > 0 &&
    description.trim().length > 0 &&
    image !== null &&
    !nameError &&
    !tickerError &&
    !descriptionError &&
    !xHandleError &&
    !telegramError &&
    !validateWebsite(website.trim()) &&
    !devBuyError;

  const journeyDoc: JourneyDoc = {
    version: 1,
    tokenName: name.trim(),
    ticker,
    why: why.trim(),
    supplyRationale: supplyRationale.trim(),
    milestones,
  };
  // A design commitment replaces the journey; without either, the launch
  // records the zero hash and nothing is validated.
  const journeyProblem =
    designCommitment || !commitmentOn ? null : validateJourney(journeyDoc);

  const seeding = devBuyWei > 0n;
  const total = seeding ? LAUNCH_POOL.steps.length : undefined;
  function working(label: string, step?: number) {
    setStatus({ kind: "working", label, step: seeding ? step : undefined, total });
  }

  async function waitOk(hash: `0x${string}`, step?: number) {
    if (!publicClient) throw new Error("No RPC client.");
    working("Waiting for confirmation…", step);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted.");
    return receipt;
  }

  /**
   * createPool, approve, addLiquidity on the fresh token. Never throws: by
   * now the token is live, so a failure here is reported beside the token
   * address and the token page can finish the job from whichever step failed.
   */
  async function seedPool(token: `0x${string}`): Promise<PoolOutcome> {
    let stepName: PoolStep = "createPool";
    let poolId: bigint | undefined;
    try {
      if (!publicClient || !address) throw new Error("No RPC client.");
      working(LAUNCH_POOL.labels.createPool, 2);
      const createHash = await writeWithGas(publicClient, address, writeContractAsync, {
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "createPool",
        args: [token, LAUNCH_POOL.optInProtocolFee],
      });
      const createReceipt = await waitOk(createHash, 2);
      for (const log of createReceipt.logs) {
        if (log.address.toLowerCase() !== LAUNCH_CHAIN.ammAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: launchAmmAbi, ...log });
          if (decoded.eventName === "PoolCreated") {
            poolId = (decoded.args as { poolId: bigint }).poolId;
            break;
          }
        } catch {
          // not our event
        }
      }
      if (poolId === undefined) {
        // poolOf stores poolId + 1 so that 0 can mean "no pool".
        const stored = await publicClient.readContract({
          abi: launchAmmAbi,
          address: LAUNCH_CHAIN.ammAddress,
          functionName: "poolOf",
          args: [token, address],
        });
        if (stored === 0n) throw new Error("The pool could not be found after it was created.");
        poolId = stored - 1n;
      }

      stepName = "approve";
      working(LAUNCH_POOL.labels.approve, 3);
      const approveHash = await writeWithGas(publicClient, address, writeContractAsync, {
        abi: erc20Abi,
        address: token,
        functionName: "approve",
        args: [LAUNCH_CHAIN.ammAddress, tokensForPool],
      });
      await waitOk(approveHash, 3);

      stepName = "addLiquidity";
      working(LAUNCH_POOL.labels.addLiquidity, 4);
      const addHash = await writeWithGas(publicClient, address, writeContractAsync, {
        abi: launchAmmAbi,
        address: LAUNCH_CHAIN.ammAddress,
        functionName: "addLiquidity",
        args: [poolId, tokensForPool],
        value: devBuyWei,
      });
      await waitOk(addHash, 4);
      return { kind: "seeded", poolId, ethWei: devBuyWei, tokensWei: tokensForPool, txHash: addHash };
    } catch (err) {
      console.error("pool seeding failed", stepName, err, connector?.id);
      return {
        kind: "failed",
        failedAt: stepName,
        poolId,
        cause: describeTxError(err).kind === "rejected" ? "rejected" : "failed",
        message: friendlyPoolError(err),
      };
    }
  }

  async function launch() {
    if (status.kind === "working") return;
    try {
      if (!isConnected || !address) throw new Error("Connect a wallet first.");
      if (!publicClient) throw new Error("No RPC client.");

      // Hard network guard — never sign on any chain but 46630.
      working("Checking network…");
      if (!(await ensureChain())) {
        throw new Error(`Switch to ${LAUNCH_CHAIN.name} to continue.`);
      }

      // Preflight: fail fast on missing fee data or an underfunded wallet,
      // before any upload or publish happens.
      if (launchFee === undefined || neededWei === undefined) {
        throw new Error(
          "The launch fee could not be read from the factory. Check your connection, reload, and retry.",
        );
      }
      working("Checking wallet balance…");
      const liveBalance = await publicClient.getBalance({ address });
      if (liveBalance < neededWei) {
        throw new Error(
          seeding
            ? `Not enough ETH to launch. This wallet holds ${fmtEth(liveBalance)}, but launching needs the ${fmtEth(launchFee)} launch fee, your ${fmtEth(devBuyWei)} developer buy and gas for ${LAUNCH_POOL.steps.length} transactions (about ${fmtEth(neededWei)} total). Fund the wallet on ${LAUNCH_CHAIN.name} and retry.`
            : `Not enough ETH to launch. This wallet holds ${fmtEth(liveBalance)}, but launching needs the ${fmtEth(launchFee)} launch fee plus gas (about ${fmtEth(neededWei)} total). Fund the wallet on ${LAUNCH_CHAIN.name} and retry.`,
        );
      }

      // Everything the factory call needs except the image URL is known now,
      // so it can be simulated before a blob or a database row is written.
      const salt = randomSalt();
      const descriptionText = description.trim();
      const descriptionHash = hashDescription(descriptionText);
      // The on-chain commitment: either the published design's snapshot hash
      // (already stored server-side at publish), or a v1 journey doc hashed
      // client-side with the server re-hashing before it stores.
      const journeyHash: `0x${string}` = designCommitment
        ? designCommitment.snapshotHash
        : commitmentOn
          ? hashJourney(journeyDoc)
          : ZERO_JOURNEY_HASH;
      // Vesting is not offered on the form, so every launch mints the whole
      // supply to the creator. content/launch.ts keeps the validator for the
      // day the control comes back.
      const vestingParams = {
        amount: 0n,
        startTimestamp: 0n,
        durationSeconds: 0n,
        cliffSeconds: 0n,
      };
      const launchTx = (imageURI: string): TxParams<typeof tokenFactoryAbi, "launchToken"> => ({
        abi: tokenFactoryAbi,
        address: LAUNCH_CHAIN.factoryAddress,
        functionName: "launchToken",
        args: [
          {
            name: name.trim(),
            symbol: ticker,
            totalSupply: totalSupplyWei,
            imageURI,
            xHandle,
            website: website.trim(),
            descriptionHash,
            journeyHash,
          },
          vestingParams,
          salt,
        ],
        value: launchFee,
      });

      // 0. Simulate on our own RPC. A paused factory, a changed fee or an
      // empty name surfaces here, decoded, before anything is uploaded.
      working("Checking with the factory…");
      await preflightWrite(publicClient, address, launchTx(""));

      // 1. Image → content-addressed blob. Required, and step1Valid enforces
      // it; the guard keeps the type narrow.
      if (!image) throw new Error("Choose a token image first.");
      working("Uploading image…");
      const fd = new FormData();
      fd.append("file", image.file);
      const uploadRes = await fetch("/api/upload-image", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Image upload failed.");
      const imageURI: string = uploadJson.url;

      // 2. The description text and Telegram handle. Only the description's
      // keccak256 goes on-chain, so the text is stored first, keyed by the
      // hash the tx will carry, and the token page re-verifies it on load.
      working("Saving description…");
      const metaRes = await fetch("/api/token-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: descriptionText,
          telegram: telegram || null,
          clientHash: descriptionHash,
          creator: address,
        }),
      });
      const metaJson = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaJson.error ?? "Saving the description failed.");

      // 3. The journey document, when there is one.
      if (!designCommitment && commitmentOn) {
        working("Publishing journey…");
        const res = await fetch("/api/journeys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc: journeyDoc, clientHash: journeyHash, creator: address }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Journey publish failed.");
      }

      // 4. Launch on-chain, with the gas limit estimated on our RPC so the
      // wallet does not have to.
      working("Confirm the launch in your wallet…", 1);
      const txHash = await writeWithGas(publicClient, address, writeContractAsync, launchTx(imageURI));
      const receipt = await waitOk(txHash, 1);

      let token: `0x${string}` | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== LAUNCH_CHAIN.factoryAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: tokenFactoryAbi, ...log });
          if (decoded.eventName === "TokenLaunched") {
            token = (decoded.args as { token: `0x${string}` }).token;
            break;
          }
        } catch {
          // not our event
        }
      }
      if (!token) throw new Error("Launched, but could not decode the token address.");

      // 5. The developer buy seeds the creator's pool. The token is live
      // whatever happens here.
      const pool: PoolOutcome = seeding ? await seedPool(token) : { kind: "skipped" };

      // Attach the deployed address back to the design record. Best-effort:
      // the on-chain hash commitment already proves the linkage, and the
      // server re-verifies against the indexer before storing anything.
      if (designCommitment) {
        await fetch(`/api/ideation/token-designs/${designCommitment.id}/attach-deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenAddress: token.toLowerCase(), txHash }),
        }).catch(() => {});
      }

      setStatus({ kind: "success", token, txHash, pool });
    } catch (err) {
      console.error("launch failed", err, connector?.id);
      setStatus({ kind: "error", message: friendlyLaunchError(err) });
    }
  }

  if (status.kind === "success") {
    const pool = status.pool;
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl border border-ink-700/70 p-8 text-center">
        <StatusChip tone="success" variant="pill">
          Deployed on {LAUNCH_CHAIN.name}
        </StatusChip>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-50">
          {name.trim()} is live
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          {designCommitment
            ? "The published design is committed on-chain via its snapshot hash."
            : commitmentOn
              ? "The journey document is committed on-chain via its hash."
              : "Launched without a commitment."}
        </p>
        <p className="mt-4 break-all font-mono text-xs text-ink-400">{status.token}</p>
        <AccountLink tokenAddress={status.token.toLowerCase()} txHash={status.txHash} />
        {pool.kind === "seeded" ? (
          <div className="mt-4 space-y-2">
            <StatusChip tone="success" variant="pill">
              Pool seeded with {fmtEth(pool.ethWei)} and {LAUNCH_POOL_SHARE_PCT}% of the supply
            </StatusChip>
            <p className="text-sm text-ink-300">
              Opening price {formatPriceEth(pool.ethWei, pool.tokensWei)} ETH per {ticker}. Trading is
              open on the token page.
            </p>
          </div>
        ) : pool.kind === "failed" ? (
          <div className="mt-4 text-left">
            <StatusChip tone={pool.cause === "rejected" ? "warning" : "error"} variant="block">
              {pool.poolId === undefined
                ? `Your token is live, but the pool was not created. ${pool.message} Open the token page to create the pool and add liquidity as the creator.`
                : `Your token is live and its pool exists, but no liquidity was added. ${pool.message} Open the token page and use Add liquidity with ${(tokensForPool / 10n ** 18n).toLocaleString("en-US")} ${ticker} and ${fmtEth(devBuyWei)} to open trading at the same price.`}
            </StatusChip>
          </div>
        ) : null}
        <div className="mt-6 text-left">
          <McpConnectCard
            target={{
              kind: "launch",
              address: status.token.toLowerCase(),
              committed: Boolean(designCommitment) || commitmentOn,
            }}
            compact
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link href={`/launch/t/${status.token.toLowerCase()}`}>View token page</Link>
          </Button>
          <a
            href={`${LAUNCH_CHAIN.explorerUrl}/tx/${status.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-electric-300 hover:text-electric-200"
          >
            Transaction <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          The token page fills in once the indexer has seen the launch, usually within a minute.
        </p>
      </div>
    );
  }

  const prefixedInput =
    "flex items-center gap-0 px-0 py-0 focus-within:border-electric-500/60 focus-within:ring-1 focus-within:ring-electric-500/30";
  const bareInput =
    "w-full bg-transparent py-2.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="glass rounded-2xl border border-ink-700/70 p-6 md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {([1, 2] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={s === 2 && (!step1Valid || !!journeyProblem)}
                onClick={() => setStep(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  step === s
                    ? "bg-electric-500/20 text-electric-200 border border-electric-500/50"
                    : "border border-ink-700/70 text-ink-400 hover:text-ink-200",
                )}
              >
                {s}. {s === 1 ? "Token" : "Launch"}
              </button>
            ))}
          </div>
          <ConnectButton />
        </div>

        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Name"
                required
                error={nameError}
                hint={LAUNCH_FORM.name.hint}
                counter={`${name.length}/${LAUNCH_FORM.name.max}`}
              >
                <Input
                  value={name}
                  maxLength={LAUNCH_FORM.name.max}
                  placeholder="Token name"
                  onChange={(e) => setName(e.target.value.replace(LAUNCH_FORM.name.strip, ""))}
                />
              </Field>

              <Field
                label="Ticker"
                required
                error={tickerError}
                hint={LAUNCH_FORM.ticker.hint}
                counter={`${ticker.length}/${LAUNCH_FORM.ticker.max}`}
              >
                <Input
                  value={ticker}
                  maxLength={LAUNCH_FORM.ticker.max}
                  placeholder="SYMBOL"
                  className="font-mono uppercase"
                  onChange={(e) =>
                    setTicker(e.target.value.toUpperCase().replace(LAUNCH_FORM.ticker.strip, ""))
                  }
                />
              </Field>
            </div>

            <Field
              label="Description"
              required
              error={descriptionError}
              hint={LAUNCH_FORM.description.hint}
              counter={`${description.length}/${LAUNCH_FORM.description.max}`}
            >
              <TextArea
                value={description}
                maxLength={LAUNCH_FORM.description.max}
                rows={3}
                placeholder="What this token is and why it exists"
                className="resize-none"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <ImagePicker
              required
              previewUrl={image?.previewUrl ?? null}
              fileName={image?.file.name ?? null}
              onSelect={selectImage}
              onClear={clearImage}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="X profile"
                error={xHandleError}
                counter={`${xHandle.length}/${LAUNCH_FORM.xHandle.max}`}
              >
                <div className={cn(inputClasses, prefixedInput)}>
                  <span className="pl-3.5 text-sm text-ink-500">{LAUNCH_FORM.xHandle.prefix}</span>
                  <input
                    value={xHandle}
                    placeholder="handle"
                    className={cn(bareInput, "pr-3.5")}
                    onChange={(e) => setXHandle(normalizeXHandle(e.target.value))}
                  />
                </div>
              </Field>

              <Field
                label="Telegram"
                error={telegramError}
                counter={String(telegram.length)}
                range={`${LAUNCH_FORM.telegram.min}–${LAUNCH_FORM.telegram.max}`}
                counterMet={telegram.length >= LAUNCH_FORM.telegram.min}
              >
                <div className={cn(inputClasses, prefixedInput)}>
                  <span className="pl-3.5 text-sm text-ink-500">{LAUNCH_FORM.telegram.prefix}</span>
                  <input
                    value={telegram}
                    placeholder="community"
                    className={cn(bareInput, "pr-3.5")}
                    onChange={(e) => setTelegram(normalizeTelegram(e.target.value))}
                  />
                </div>
              </Field>
            </div>

            <Field label="Website" error={websiteError} hint={LAUNCH_FORM.website.hint}>
              <Input
                type="url"
                value={website}
                placeholder="https://example.com"
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (websiteError) setWebsiteError(validateWebsite(e.target.value.trim()));
                }}
                onBlur={() => setWebsiteError(validateWebsite(website.trim()))}
              />
            </Field>

            <Field
              label={LAUNCH_DEV_BUY.label}
              error={devBuyError}
              hint={devBuyEth ? balanceLine : `${LAUNCH_DEV_BUY.hint} ${balanceLine}.`}
            >
              <div className={cn(inputClasses, prefixedInput)}>
                <input
                  inputMode="decimal"
                  value={devBuyEth}
                  placeholder={LAUNCH_DEV_BUY.placeholder}
                  className={cn(bareInput, "tabular pl-3.5 text-lg")}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".");
                    if (v === "" || LAUNCH_DEV_BUY.pattern.test(v)) setDevBuyEth(v);
                  }}
                />
                <span className="pr-3.5 text-sm text-ink-500">{LAUNCH_DEV_BUY.suffix}</span>
              </div>
            </Field>

            {!designCommitment ? (
              <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span>
                    <span className="block text-sm font-medium text-ink-100">
                      Add a commitment
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-500">
                      Why this token exists, the supply rationale and dated
                      milestones. The hash goes on-chain with the token and can
                      never be changed. Optional now, and needed later for
                      milestone escrow and sale proceeds schedules.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={commitmentOn}
                    onChange={(e) => setCommitmentOn(e.target.checked)}
                    className="h-4 w-4 accent-electric-500"
                  />
                </label>
                {commitmentOn ? (
                  <div className="mt-4">
                    <JourneyFields
                      why={why}
                      supplyRationale={supplyRationale}
                      milestones={milestones}
                      onWhy={setWhy}
                      onSupplyRationale={setSupplyRationale}
                      onMilestones={setMilestones}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3 border-t border-ink-800/70 pt-5">
              <span className="text-xs text-ink-500">
                {journeyProblem && (why || supplyRationale) ? journeyProblem : ""}
              </span>
              <Button
                size="sm"
                disabled={!step1Valid || !!journeyProblem}
                onClick={() => setStep(2)}
              >
                Continue to launch
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {designCommitment ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-ink-300">
                  This launch commits your published token design on-chain: the
                  factory records the design&apos;s snapshot hash, so the
                  document behind this token can never be quietly rewritten.
                </p>
                <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
                  <p className="text-sm font-medium text-ink-100">{designCommitment.name}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Published design ·{" "}
                    <Link
                      href={`/t/${designCommitment.slug}`}
                      className="text-electric-300 transition-colors hover:text-electric-200"
                    >
                      /t/{designCommitment.slug}
                    </Link>
                  </p>
                  <p className="mt-2 break-all font-mono text-[11px] text-ink-500">
                    {designCommitment.snapshotHash}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-ink-400">
                    Only the supply is enforced by the contract. Allocations,
                    vesting, distribution and everything else in the design are
                    published commitments, snapshotted and tamper-evident, not
                    code.
                  </p>
                </div>
                {prefill?.designVesting ? (
                  <StatusChip tone="neutral" variant="block">
                    This design sets a team vesting schedule. Vesting is not
                    applied at launch, so the whole supply mints to your wallet
                    and the schedule stays a published commitment.
                  </StatusChip>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Token</span>
                <span className="text-ink-100">
                  {name.trim()} <span className="font-mono text-xs text-electric-300">${ticker}</span>
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Supply</span>
                <span className="tabular text-ink-100">
                  {totalSupply.toLocaleString("en-US")} to your wallet
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">{designCommitment ? "Design" : "Commitment"}</span>
                <span className="text-ink-100">
                  {designCommitment
                    ? `/t/${designCommitment.slug}, snapshot hash committed on-chain`
                    : commitmentOn
                      ? `${milestones.length} milestones, hash committed on-chain`
                      : "None"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Network</span>
                <span className="text-ink-100">{LAUNCH_CHAIN.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Launch fee</span>
                <span className="text-ink-100">
                  {launchFee === undefined
                    ? "Reading fee…"
                    : launchFee === 0n
                      ? "Free"
                      : `${formatEther(launchFee)} ETH`}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="shrink-0 text-ink-500">{LAUNCH_DEV_BUY.label}</span>
                <span className="text-right text-ink-100">
                  {seeding ? `${formatEther(devBuyWei)} ETH, seeds the pool` : LAUNCH_DEV_BUY.none}
                </span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="shrink-0 text-ink-500">{LAUNCH_POOL.labels.pool}</span>
                <span className="text-right text-ink-100">
                  {seeding
                    ? `${LAUNCH_POOL_SHARE_PCT}% of supply, opening price ${openingPrice} ETH per ${ticker}`
                    : "None. Create one later from the token page"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Total ETH needed</span>
                <span className="tabular text-ink-100">
                  {launchFee === undefined
                    ? "Reading fee…"
                    : `${formatEther(launchFee + devBuyWei)} ETH plus gas`}
                </span>
              </div>
            </div>

            <p className="break-all font-mono text-xs text-ink-500">
              journeyHash:{" "}
              {designCommitment
                ? designCommitment.snapshotHash
                : !commitmentOn
                  ? "none (launched without a commitment)"
                  : journeyProblem
                    ? "pending (complete the commitment)"
                    : hashJourney(journeyDoc)}
            </p>

            {status.kind === "error" ? (
              <StatusChip variant="block" tone="error">
                {status.message}
              </StatusChip>
            ) : null}

            <div className="flex items-center justify-between border-t border-ink-800/70 pt-5">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                {status.kind === "working" ? (
                  <span className="text-xs text-ink-400">
                    {status.label}
                    {status.step !== undefined && status.total !== undefined
                      ? ` (${status.step} of ${status.total})`
                      : ""}
                  </span>
                ) : null}
                <Button
                  disabled={!isConnected || !!journeyProblem || !step1Valid || status.kind === "working"}
                  onClick={() => void launch()}
                >
                  {status.kind === "working" ? "Launching…" : "Launch token"}
                </Button>
              </div>
            </div>
            {!isConnected ? (
              <p className="text-right text-xs text-ink-500">Connect a wallet to launch.</p>
            ) : null}
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <TokenPreviewCard
          name={name}
          ticker={ticker}
          description={description}
          imageUrl={image?.previewUrl ?? null}
          xHandle={xHandle}
          telegram={telegram}
          website={websiteError ? "" : website.trim()}
          totalSupply={totalSupply}
          launchFeeWei={launchFee}
          devBuyWei={devBuyError ? 0n : devBuyWei}
          openingPrice={devBuyError ? null : openingPrice}
        />
      </div>
    </div>
  );
}
