"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  formatEther,
} from "viem";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input, TextArea, inputClasses } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { cn } from "@/lib/utils";
import { tokenFactoryAbi } from "@/lib/abi/tokenFactory";
import {
  hashDescription,
  hashJourney,
  validateJourney,
  ZERO_JOURNEY_HASH,
  type JourneyDoc,
  type JourneyMilestone,
} from "@/lib/journey";
import {
  LAUNCH_CHAIN,
  LAUNCH_FORM,
  LAUNCH_SUPPLY,
  validateDescription,
  validateName,
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

type FlowStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "success"; token: string; txHash: string };

function randomSalt(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Rough gas allowance on top of the launch fee for the preflight check. */
const GAS_BUFFER_WEI = 500_000_000_000_000n; // 0.0005 ETH

const fmtEth = (wei: bigint) =>
  `${Number(formatEther(wei)).toLocaleString("en-US", { maximumFractionDigits: 6 })} ETH`;

/** Factory custom errors and common wallet failures, in plain language. */
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

function friendlyLaunchError(err: unknown): string {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const errorName = revert.data?.errorName;
      if (errorName && KNOWN_FACTORY_ERRORS[errorName]) return KNOWN_FACTORY_ERRORS[errorName];
      if (revert.reason) return `The factory rejected the launch: ${revert.reason}`;
      if (errorName) return `The factory rejected the launch (${errorName}).`;
    }
    const msg = err.shortMessage.toLowerCase();
    if (msg.includes("insufficient funds") || msg.includes("exceeds the balance"))
      return `Not enough ETH in this wallet to cover the launch fee plus gas. Fund it on ${LAUNCH_CHAIN.name} and retry.`;
    if (msg.includes("user rejected") || msg.includes("denied"))
      return "The wallet rejected the request. Nothing was sent.";
    return err.shortMessage.slice(0, 200);
  }
  return err instanceof Error ? err.message.split("\n")[0].slice(0, 220) : "Something went wrong.";
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
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState<string | undefined>(undefined);
  const [image, setImage] = useState<ImageState>(null);

  // Step 2 — journey
  const [why, setWhy] = useState("");
  const [supplyRationale, setSupplyRationale] = useState("");
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([
    { date: "", title: "", description: "" },
    { date: "", title: "", description: "" },
  ]);

  // Flow
  const [step, setStep] = useState<Step>(1);
  const [showOptional, setShowOptional] = useState(false);
  const [commitmentOn, setCommitmentOn] = useState(false);
  const [status, setStatus] = useState<FlowStatus>({ kind: "idle" });

  const { isConnected, address, ensureChain } = useLaunchChain();
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
  // Supply is not asked for. A ground-up launch mints LAUNCH_SUPPLY; a launch
  // started from a published design keeps that document's total, because the
  // number sits inside the snapshot hash going on-chain.
  const totalSupply = prefill?.supply ? Number(prefill.supply) : LAUNCH_SUPPLY;

  const step1Valid =
    name.trim().length > 0 &&
    ticker.length > 0 &&
    !nameError &&
    !tickerError &&
    !descriptionError &&
    !xHandleError &&
    !validateWebsite(website.trim());

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

  async function launch() {
    if (status.kind === "working") return;
    try {
      if (!isConnected || !address) throw new Error("Connect a wallet first.");

      // Hard network guard — never sign on any chain but 46630.
      setStatus({ kind: "working", label: "Checking network…" });
      if (!(await ensureChain())) {
        throw new Error(`Switch to ${LAUNCH_CHAIN.name} to continue.`);
      }

      // Preflight: fail fast on missing fee data or an underfunded wallet,
      // before any upload or journey publish happens.
      if (launchFee === undefined) {
        throw new Error(
          "The launch fee could not be read from the factory. Check your connection, reload, and retry.",
        );
      }
      if (publicClient) {
        setStatus({ kind: "working", label: "Checking wallet balance…" });
        const balance = await publicClient.getBalance({ address });
        const needed = launchFee + GAS_BUFFER_WEI;
        if (balance < needed) {
          throw new Error(
            `Not enough ETH to launch. This wallet holds ${fmtEth(balance)}, but launching needs the ${fmtEth(launchFee)} launch fee plus gas (about ${fmtEth(needed)} total). Fund the wallet on ${LAUNCH_CHAIN.name} and retry.`,
          );
        }
      }

      // 1. Image → content-addressed blob (optional field).
      let imageURI = "";
      if (image) {
        setStatus({ kind: "working", label: "Uploading image…" });
        const fd = new FormData();
        fd.append("file", image.file);
        const res = await fetch("/api/upload-image", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Image upload failed.");
        imageURI = json.url;
      }

      // 2. The on-chain commitment: either the published design's snapshot
      // hash (already stored server-side at publish), or a v1 journey doc
      // hashed client-side with the server re-hashing before it stores.
      let journeyHash: `0x${string}`;
      if (designCommitment) {
        journeyHash = designCommitment.snapshotHash;
      } else if (!commitmentOn) {
        journeyHash = ZERO_JOURNEY_HASH;
      } else {
        setStatus({ kind: "working", label: "Publishing journey…" });
        journeyHash = hashJourney(journeyDoc);
        const res = await fetch("/api/journeys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc: journeyDoc, clientHash: journeyHash, creator: address }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Journey publish failed.");
      }

      // 3. Launch on-chain.
      setStatus({ kind: "working", label: "Confirm in your wallet…" });
      const totalSupplyWei = BigInt(totalSupply) * 10n ** 18n;
      // Vesting is not offered on the form, so every launch mints the whole
      // supply to the creator. content/launch.ts keeps the validator for the
      // day the control comes back.
      const vestingParams = {
        amount: 0n,
        startTimestamp: 0n,
        durationSeconds: 0n,
        cliffSeconds: 0n,
      };
      const txHash = await writeContractAsync({
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
            descriptionHash: hashDescription(description.trim()),
            journeyHash,
          },
          vestingParams,
          randomSalt(),
        ],
        value: launchFee ?? 0n,
      });

      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      if (!publicClient) throw new Error("No RPC client.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("Transaction reverted.");

      let token: string | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== LAUNCH_CHAIN.factoryAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: tokenFactoryAbi, ...log });
          if (decoded.eventName === "TokenLaunched") {
            token = (decoded.args as { token: string }).token;
            break;
          }
        } catch {
          // not our event
        }
      }
      if (!token) throw new Error("Launched, but could not decode the token address.");

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

      setStatus({ kind: "success", token, txHash });
    } catch (err) {
      setStatus({ kind: "error", message: friendlyLaunchError(err) });
    }
  }

  if (status.kind === "success") {
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
        <div className="mt-6 text-left">
          <McpConnectCard
            address={status.token.toLowerCase()}
            committed={Boolean(designCommitment) || commitmentOn}
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
      </div>
    );
  }

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

            <div className="rounded-xl border border-ink-700/60 bg-ink-950/50">
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                aria-expanded={showOptional}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <span>
                  <span className="block text-sm font-medium text-ink-100">Optional details</span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    Description, image, X profile and website. None of these are required to launch.
                  </span>
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-ink-400 transition-transform", showOptional && "rotate-180")}
                />
              </button>
              {showOptional ? (
                <div className="space-y-5 border-t border-ink-800/70 p-4">
            <Field
              label="Description"
              error={descriptionError}
              hint={LAUNCH_FORM.description.hint}
              counter={`${description.length}/${LAUNCH_FORM.description.max}`}
            >
              <TextArea
                value={description}
                maxLength={LAUNCH_FORM.description.max}
                rows={3}
                placeholder="A short description of the token"
                className="resize-none"
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <ImagePicker
              previewUrl={image?.previewUrl ?? null}
              fileName={image?.file.name ?? null}
              onSelect={selectImage}
              onClear={clearImage}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="X profile" error={xHandleError}>
                <div
                  className={cn(
                    inputClasses,
                    "flex items-center gap-0 px-0 py-0 focus-within:border-electric-500/60 focus-within:ring-1 focus-within:ring-electric-500/30",
                  )}
                >
                  <span className="pl-3.5 text-sm text-ink-500">{LAUNCH_FORM.xHandle.prefix}</span>
                  <input
                    value={xHandle}
                    maxLength={LAUNCH_FORM.xHandle.max}
                    placeholder="handle"
                    className="w-full bg-transparent py-2.5 pr-3.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none"
                    onChange={(e) => setXHandle(e.target.value.replace(LAUNCH_FORM.xHandle.strip, ""))}
                  />
                </div>
              </Field>

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
            </div>

                </div>
              ) : null}
            </div>

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
                  <span className="text-xs text-ink-400">{status.label}</span>
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
          website={websiteError ? "" : website.trim()}
          totalSupply={totalSupply}
          launchFeeWei={launchFee}
        />
      </div>
    </div>
  );
}
