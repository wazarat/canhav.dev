"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { decodeEventLog, formatEther, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input, TextArea, inputClasses } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import type { ProjectContext } from "@/lib/ideation";
import { cn } from "@/lib/utils";
import { curveLauncherAbi } from "@/lib/abi/curveLauncher";
import { formatCount, formatPriceEth } from "@/lib/format";
import {
  hashDescription,
  hashJourney,
  validateJourney,
  ZERO_JOURNEY_HASH,
  type JourneyDoc,
  type JourneyMilestone,
} from "@/lib/journey";
import { preflightWrite, writeWithGas, type TxParams } from "@/lib/tx";
import {
  LAUNCH_CHAIN_COPY,
  LAUNCH_NOT_LIVE,
  launchChain,
  LAUNCH_DEV_BUY,
  LAUNCH_FORM,
  LAUNCH_CURVE,
  LAUNCH_CURVE_SHARE_PCT,
  LAUNCH_PARAMS,
  LAUNCH_PROJECT_COPY,
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

import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";

import { AccountLink, type LinkedProject } from "./AccountLink";
import { ConnectButton } from "./ConnectButton";
import { CurveProgress } from "./CurveProgress";
import { friendlyCurveError } from "./curveErrors";
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
  | {
      kind: "success";
      token: string;
      txHash: string;
      /** The developer buy the launch made on the curve, when there was one. */
      devBuy: { ethWei: bigint; tokensWei: bigint } | null;
      /** The curve right after the launch transaction, read from the launcher. */
      curve: { raisedWei: bigint; thresholdWei: bigint; graduated: boolean } | null;
    };

function randomSalt(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Rough gas allowance per transaction on top of the launch fee for the preflight check. */
const GAS_BUFFER_WEI = 500_000_000_000_000n; // 0.0005 ETH

const fmtEth = (wei: bigint) =>
  `${Number(formatEther(wei)).toLocaleString("en-US", { maximumFractionDigits: 6 })} ETH`;

function friendlyLaunchError(err: unknown, chainName: string): string {
  return friendlyCurveError(err, "the launch", "the launch fee plus your developer buy", chainName);
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
  /** Milestones in the published snapshot (M48). Zero means no sales, escrow or updates after launch. */
  milestoneCount: number;
}

/** One of the signed-in account's projects, for the optional Project block (M56). */
export interface LaunchProjectOption {
  id: string;
  name: string;
  chain: ProjectChain;
  hasKit: boolean;
}

type ProjectMode = (typeof LAUNCH_PROJECT_COPY.options)[number]["value"];

export function LaunchForm({
  prefill,
  designCommitment,
  project,
  projects = null,
  chain: fixedChain,
  launchable = [DEFAULT_PROJECT_CHAIN],
}: {
  /**
   * Chains a launch can be sent on right now, deployed and indexed. Worked
   * out on the server, which is the only side that knows whether a chain's
   * indexer is configured. A launch that is not indexed cannot be linked.
   */
  launchable?: readonly ProjectChain[];
  /**
   * The chain the launch must go on (M54), set when it starts from a project
   * or from a design linked to one. Left out, the launcher picks.
   */
  chain?: ProjectChain;
  prefill?: LaunchPrefill;
  designCommitment?: DesignCommitment;
  /** The studio project this launch was started from (?project=<id>). */
  project?: ProjectContext;
  /** The account's projects to pick from. Null when signed out. */
  projects?: LaunchProjectOption[] | null;
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

  const [pickedChain, setPickedChain] = useState<ProjectChain>(DEFAULT_PROJECT_CHAIN);
  const chain = fixedChain ?? pickedChain;
  const net = launchChain(chain);
  const open = net.live && launchable.includes(chain);

  // The optional Project block (M56). Offered on a plain launch only: a launch
  // from a project already has one, and a design brings its own link.
  const offerProject = !project && !designCommitment;
  const [projectMode, setProjectMode] = useState<ProjectMode>("none");
  const [pickedProjectId, setPickedProjectId] = useState("");
  // A token is linked to a project on the same chain (M54).
  const chainProjects = (projects ?? []).filter((p) => p.chain === chain);
  const pickedProject =
    offerProject && projectMode === "existing"
      ? (chainProjects.find((p) => p.id === pickedProjectId) ?? null)
      : null;
  const startProject = offerProject && projects !== null && projectMode === "create";
  /** The project the success screen ended up linking, for the agent prompt. */
  const [linkedProject, setLinkedProject] = useState<LinkedProject | null>(null);
  const { isConnected, address, ensureChain } = useLaunchChain(chain);
  const { connector } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: net.chainId });

  // Launch fee is read live from the launcher (settable only through the
  // timelock, hard-capped by MAX_LAUNCH_FEE). Shown on the review step and
  // sent, plus the developer buy, as the exact tx value; the launcher
  // requires strict equality.
  const { data: launchFee } = useReadContract({
    chainId: net.chainId,
    abi: curveLauncherAbi,
    address: net.curveAddress,
    functionName: "launchFee",
  });
  const { data: balance } = useBalance({
    address,
    chainId: net.chainId,
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

  // Developer buy. Spent on the curve inside the launch transaction as the
  // first buy, tax exempt, capped by the launcher. 0n means no buy.
  const devBuyFormatError = validateDevBuy(devBuyEth);
  const devBuyWei = !devBuyEth || devBuyFormatError ? 0n : parseEther(devBuyEth);
  const neededWei = launchFee === undefined ? undefined : launchFee + devBuyWei + GAS_BUFFER_WEI;
  // Only once both the balance and the fee are known, so the Continue button
  // does not flicker disabled on first paint.
  const devBuyBalanceError =
    !devBuyFormatError && devBuyWei > 0n && balance && neededWei !== undefined && balance.value < neededWei
      ? "More than this wallet can cover after the launch fee and gas."
      : undefined;
  const devBuyError = devBuyFormatError ?? devBuyBalanceError;
  // The launcher quotes the first buy for this supply, so the opening price
  // on the card is the number the transaction will produce.
  const { data: devBuyQuote } = useReadContract({
    chainId: net.chainId,
    abi: curveLauncherAbi,
    address: net.curveAddress,
    functionName: "quoteLaunch",
    args: [totalSupplyWei, devBuyWei],
    query: { enabled: devBuyWei > 0n && devBuyWei <= LAUNCH_CURVE.devBuyMaxWei },
  });
  const devBuyTokens = devBuyWei > 0n && devBuyQuote ? devBuyQuote : null;
  const openingPrice = devBuyTokens ? formatPriceEth(devBuyWei, devBuyTokens) : null;
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

  const buying = devBuyWei > 0n;
  function working(label: string) {
    setStatus({ kind: "working", label });
  }

  async function waitOk(hash: `0x${string}`) {
    if (!publicClient) throw new Error("No RPC client.");
    working("Waiting for confirmation…");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted.");
    return receipt;
  }

  async function launch() {
    if (status.kind === "working") return;
    try {
      if (!isConnected || !address) throw new Error("Connect a wallet first.");
      if (!publicClient) throw new Error("No RPC client.");
      if (!open) throw new Error(LAUNCH_NOT_LIVE(net.name));

      // Hard network guard. Never sign on any chain but the one this launch is for.
      working("Checking network…");
      if (!(await ensureChain())) {
        throw new Error(`Switch to ${net.name} to continue.`);
      }

      // Preflight: fail fast on missing fee data or an underfunded wallet,
      // before any upload or publish happens.
      if (launchFee === undefined || neededWei === undefined) {
        throw new Error(
          "The launch fee could not be read from the launcher. Check your connection, reload, and retry.",
        );
      }
      working("Checking wallet balance…");
      const liveBalance = await publicClient.getBalance({ address });
      if (liveBalance < neededWei) {
        throw new Error(
          buying
            ? `Not enough ETH to launch. This wallet holds ${fmtEth(liveBalance)}, but launching needs the ${fmtEth(launchFee)} launch fee, your ${fmtEth(devBuyWei)} developer buy and gas (about ${fmtEth(neededWei)} total). Fund the wallet on ${net.name} and retry.`
            : `Not enough ETH to launch. This wallet holds ${fmtEth(liveBalance)}, but launching needs the ${fmtEth(launchFee)} launch fee plus gas (about ${fmtEth(neededWei)} total). Fund the wallet on ${net.name} and retry.`,
        );
      }

      // Everything the launcher call needs except the image URL is known now,
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
      // One transaction: the launcher clones the token, opens the curve and
      // makes the developer buy. msg.value is the fee plus the buy, exactly.
      const launchTx = (imageURI: string): TxParams<typeof curveLauncherAbi, "launch"> => ({
        abi: curveLauncherAbi,
        address: net.curveAddress,
        functionName: "launch",
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
          salt,
          devBuyWei,
        ],
        value: launchFee + devBuyWei,
      });

      // 0. Simulate on our own RPC. A paused launcher, a changed fee or an
      // empty name surfaces here, decoded, before anything is uploaded.
      working("Checking with the launcher…");
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
      working("Confirm the launch in your wallet…");
      const txHash = await writeWithGas(publicClient, address, writeContractAsync, launchTx(imageURI));
      const receipt = await waitOk(txHash);

      let token: `0x${string}` | null = null;
      let devBuy: { ethWei: bigint; tokensWei: bigint } | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== net.curveAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({ abi: curveLauncherAbi, ...log });
          if (decoded.eventName === "TokenLaunched") {
            token = (decoded.args as { token: `0x${string}` }).token;
          } else if (decoded.eventName === "CurveBuy") {
            const a = decoded.args as { ethIn: bigint; tokensOut: bigint };
            devBuy = { ethWei: a.ethIn, tokensWei: a.tokensOut };
          }
        } catch {
          // not our event
        }
      }
      if (!token) throw new Error("Launched, but could not decode the token address.");

      // 5. The curve right after the launch, read from the launcher so the
      // success screen shows the exact on-chain state. Best-effort.
      let curve: { raisedWei: bigint; thresholdWei: bigint; graduated: boolean } | null = null;
      try {
        const c = await publicClient.readContract({
          abi: curveLauncherAbi,
          address: net.curveAddress,
          functionName: "curve",
          args: [token],
        });
        curve = {
          raisedWei: c.virtualEth - LAUNCH_CURVE.virtualEthWei,
          thresholdWei: LAUNCH_CURVE.thresholdWei,
          graduated: c.graduated,
        };
      } catch {
        curve = null;
      }

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

      setStatus({ kind: "success", token, txHash, devBuy, curve });
    } catch (err) {
      console.error("launch failed", err, connector?.id);
      setStatus({ kind: "error", message: friendlyLaunchError(err, net.name) });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl border border-ink-700/70 p-8 text-center">
        <StatusChip tone="success" variant="pill">
          Deployed on {net.name}
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
        <AccountLink
          tokenAddress={status.token.toLowerCase()}
          txHash={status.txHash}
          projectId={project?.id ?? pickedProject?.id}
          projectName={project?.name ?? pickedProject?.name}
          createProject={startProject ? { description: description.trim() } : undefined}
          onLinked={setLinkedProject}
        />
        {status.devBuy ? (
          <div className="mt-4 space-y-2">
            <StatusChip tone="success" variant="pill">
              Bought {formatCount(Number(status.devBuy.tokensWei / 10n ** 18n))} {ticker} with{" "}
              {fmtEth(status.devBuy.ethWei)} on the curve
            </StatusChip>
            <p className="text-sm text-ink-300">
              Opening price {formatPriceEth(status.devBuy.ethWei, status.devBuy.tokensWei)} ETH per{" "}
              {ticker}. Trading is open on the token page.
            </p>
          </div>
        ) : null}
        {status.curve ? (
          <div className="mt-4 text-left">
            <CurveProgress
              raisedWei={status.curve.raisedWei}
              thresholdWei={status.curve.thresholdWei}
              graduated={status.curve.graduated}
            />
            {status.curve.graduated ? (
              <p className="mt-2 text-sm text-ink-300">
                Graduated in the launch transaction. The pool is live and its liquidity is locked.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 text-left">
          <McpConnectCard
            target={{
              kind: "launch",
              address: status.token.toLowerCase(),
              committed: Boolean(designCommitment) || commitmentOn,
              name: name.trim(),
              project: linkedProject
                ? {
                    ...linkedProject,
                    hasKit:
                      project?.id === linkedProject.id
                        ? project.shapes.length > 0
                        : pickedProject?.id === linkedProject.id && pickedProject.hasKit,
                  }
                : null,
            }}
            compact
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link href={`/launch/t/${status.token.toLowerCase()}`}>View token page</Link>
          </Button>
          <a
            href={`${net.explorerUrl}/tx/${status.txHash}`}
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
          <ConnectButton chain={chain} />
        </div>

        {fixedChain ? null : (
          <div className="mb-5">
            <ChipRadioGroup
              label={LAUNCH_CHAIN_COPY.label}
              hint={LAUNCH_CHAIN_COPY.hint}
              value={chain}
              onChange={(v) => {
                if (v) setPickedChain(v);
              }}
              options={LAUNCH_CHAIN_COPY.options}
            />
          </div>
        )}
        {open ? null : (
          <div className="mb-5">
            <StatusChip tone="neutral" variant="block">
              {LAUNCH_NOT_LIVE(net.name)}
            </StatusChip>
          </div>
        )}

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

            {offerProject ? (
              <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
                {projects === null ? (
                  <>
                    <p className="text-sm font-medium text-ink-100">{LAUNCH_PROJECT_COPY.label}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {LAUNCH_PROJECT_COPY.hint}{" "}
                      <Link
                        href="/studio"
                        className="text-electric-300 transition-colors hover:text-electric-200"
                      >
                        Sign in
                      </Link>{" "}
                      {LAUNCH_PROJECT_COPY.signedOut}
                    </p>
                  </>
                ) : (
                  <>
                    <ChipRadioGroup
                      label={LAUNCH_PROJECT_COPY.label}
                      hint={LAUNCH_PROJECT_COPY.hint}
                      value={projectMode}
                      onChange={(v) => setProjectMode(v || "none")}
                      options={LAUNCH_PROJECT_COPY.options}
                    />
                    {projectMode === "existing" ? (
                      chainProjects.length > 0 ? (
                        <select
                          value={pickedProject?.id ?? ""}
                          onChange={(e) => setPickedProjectId(e.target.value)}
                          aria-label={LAUNCH_PROJECT_COPY.label}
                          className={cn(
                            inputClasses,
                            "mt-3 max-w-xs appearance-none",
                            !pickedProject && "text-ink-500",
                          )}
                        >
                          <option value="" disabled>
                            {LAUNCH_PROJECT_COPY.choose}
                          </option>
                          {chainProjects.map((p) => (
                            <option key={p.id} value={p.id} className="bg-ink-950 text-ink-50">
                              {p.name || "Untitled"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="mt-3">
                          <StatusChip tone="neutral" variant="block">
                            {LAUNCH_PROJECT_COPY.noneOnChain(net.name)}
                          </StatusChip>
                        </div>
                      )
                    ) : null}
                    {projectMode === "create" ? (
                      <p className="mt-3 text-xs leading-relaxed text-ink-500">
                        {LAUNCH_PROJECT_COPY.createHint}
                      </p>
                    ) : null}
                  </>
                )}
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
                  This launch commits your published token design on-chain. The
                  launcher records the design&apos;s snapshot hash, so the
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
                {designCommitment.milestoneCount > 0 ? (
                  <StatusChip tone="success" variant="block">
                    {designCommitment.milestoneCount} milestones from the published design. After
                    launch you can sell an allocation, lock supply in escrow and post updates
                    against them.
                  </StatusChip>
                ) : (
                  <StatusChip tone="neutral" variant="block">
                    This design has no milestones, so the launch will not offer sales, escrow or
                    progress updates. Add them in the Post-launch step of the design and publish
                    again first.{" "}
                    <Link
                      href={`/studio/token/${designCommitment.id}`}
                      className="text-electric-300 transition-colors hover:text-electric-200"
                    >
                      Open the design
                    </Link>
                  </StatusChip>
                )}
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
              {project ? (
                <div className="flex justify-between gap-4 py-1">
                  <span className="shrink-0 text-ink-500">Project</span>
                  <span className="text-right text-ink-100">
                    {project.name}
                    {project.shapeLabels.length ? `, ${project.shapeLabels.join(" · ")}` : ""}
                  </span>
                </div>
              ) : pickedProject || startProject ? (
                <div className="flex justify-between gap-4 py-1">
                  <span className="shrink-0 text-ink-500">{LAUNCH_PROJECT_COPY.label}</span>
                  <span className="text-right text-ink-100">
                    {pickedProject ? pickedProject.name || "Untitled" : LAUNCH_PROJECT_COPY.reviewCreate}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Supply</span>
                <span className="tabular text-ink-100">
                  {totalSupply.toLocaleString("en-US")} minted, {LAUNCH_CURVE_SHARE_PCT}% on the curve
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">{designCommitment ? "Design" : "Commitment"}</span>
                <span className="text-ink-100">
                  {designCommitment
                    ? `/t/${designCommitment.slug}, ${designCommitment.milestoneCount} milestones, snapshot hash committed on-chain`
                    : commitmentOn
                      ? `${milestones.length} milestones, hash committed on-chain`
                      : "None"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Network</span>
                <span className="text-ink-100">{net.name}</span>
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
                  {buying ? `${formatEther(devBuyWei)} ETH, your first buy on the curve` : LAUNCH_DEV_BUY.none}
                </span>
              </div>
              {buying ? (
                <div className="flex justify-between gap-4 py-1">
                  <span className="shrink-0 text-ink-500">{LAUNCH_PARAMS.labels.openingPrice}</span>
                  <span className="text-right text-ink-100">
                    {openingPrice ? `${openingPrice} ETH per ${ticker}` : "Reading quote…"}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 py-1">
                <span className="shrink-0 text-ink-500">{LAUNCH_PARAMS.labels.graduation}</span>
                <span className="text-right text-ink-100">{LAUNCH_PARAMS.graduation}</span>
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
              <span className="text-ink-600">journeyHash</span>{" "}
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
                  </span>
                ) : null}
                <Button
                  disabled={!isConnected || !open || !!journeyProblem || !step1Valid || status.kind === "working"}
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
          project={project ?? null}
          projectLabel={
            project?.name ||
            (pickedProject
              ? pickedProject.name || "Untitled"
              : startProject
                ? LAUNCH_PARAMS.project.create
                : LAUNCH_PARAMS.project.none)
          }
        />
      </div>
    </div>
  );
}
