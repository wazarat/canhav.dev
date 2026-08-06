"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { decodeEventLog, formatEther } from "viem";
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
  type JourneyDoc,
  type JourneyMilestone,
} from "@/lib/journey";
import {
  LAUNCH_CHAIN,
  LAUNCH_FORM,
  validateDescription,
  validateName,
  validateTicker,
  validateVesting,
  validateWebsite,
  validateXHandle,
} from "@/content/launch";

import { ConnectButton } from "./ConnectButton";
import { ImagePicker } from "./ImagePicker";
import { JourneyFields } from "./JourneyFields";
import { TokenPreviewCard } from "./TokenPreviewCard";
import { useLaunchChain } from "./useLaunchChain";

type ImageState = { file: File; previewUrl: string } | null;
type Step = 1 | 2 | 3;

type FlowStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "success"; token: string; txHash: string };

const SUPPLY_MAX = 1_000_000_000_000; // 1T whole tokens

function randomSalt(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function LaunchForm() {
  // Step 1 — token details
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [supply, setSupply] = useState("");
  const [description, setDescription] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState<string | undefined>(undefined);
  const [image, setImage] = useState<ImageState>(null);

  // Step 1 — optional vesting
  const [vestingOn, setVestingOn] = useState(false);
  const [vestPercent, setVestPercent] = useState("20");
  const [vestDays, setVestDays] = useState("180");
  const [cliffDays, setCliffDays] = useState("30");

  // Step 2 — journey
  const [why, setWhy] = useState("");
  const [supplyRationale, setSupplyRationale] = useState("");
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([
    { date: "", title: "", description: "" },
    { date: "", title: "", description: "" },
  ]);

  // Flow
  const [step, setStep] = useState<Step>(1);
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
  const supplyNum = /^[0-9]+$/.test(supply) ? Number(supply) : NaN;
  const supplyError =
    supply === ""
      ? undefined
      : !Number.isInteger(supplyNum) || supplyNum < 1 || supplyNum > SUPPLY_MAX
        ? `Whole number between 1 and ${SUPPLY_MAX.toLocaleString("en-US")}.`
        : undefined;

  const vestingNums = {
    percent: Number(vestPercent),
    durationDays: Number(vestDays),
    cliffDays: Number(cliffDays),
  };
  const vestingError = vestingOn ? validateVesting(vestingNums) : undefined;

  const step1Valid =
    name.trim().length > 0 &&
    ticker.length > 0 &&
    /^[0-9]+$/.test(supply) &&
    !nameError &&
    !tickerError &&
    !supplyError &&
    !descriptionError &&
    !xHandleError &&
    !vestingError &&
    !validateWebsite(website.trim());

  const journeyDoc: JourneyDoc = {
    version: 1,
    tokenName: name.trim(),
    ticker,
    why: why.trim(),
    supplyRationale: supplyRationale.trim(),
    milestones,
  };
  const journeyProblem = validateJourney(journeyDoc);

  async function launch() {
    if (status.kind === "working") return;
    try {
      if (!isConnected || !address) throw new Error("Connect a wallet first.");

      // Hard network guard — never sign on any chain but 46630.
      setStatus({ kind: "working", label: "Checking network…" });
      if (!(await ensureChain())) {
        throw new Error(`Switch to ${LAUNCH_CHAIN.name} to continue.`);
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

      // 2. Journey → hash client-side, server must agree before storing.
      setStatus({ kind: "working", label: "Publishing journey…" });
      const journeyHash = hashJourney(journeyDoc);
      const res = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: journeyDoc, clientHash: journeyHash, creator: address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Journey publish failed.");

      // 3. Launch on-chain.
      setStatus({ kind: "working", label: "Confirm in your wallet…" });
      const totalSupplyWei = BigInt(supply) * 10n ** 18n;
      const vestingParams = vestingOn
        ? {
            amount: (totalSupplyWei * BigInt(vestingNums.percent)) / 100n,
            startTimestamp: 0n, // factory resolves 0 → block.timestamp
            durationSeconds: BigInt(vestingNums.durationDays) * 86400n,
            cliffSeconds: BigInt(vestingNums.cliffDays) * 86400n,
          }
        : { amount: 0n, startTimestamp: 0n, durationSeconds: 0n, cliffSeconds: 0n };
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

      setStatus({ kind: "success", token, txHash });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message.split("\n")[0].slice(0, 200)
          : "Something went wrong.";
      setStatus({ kind: "error", message });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl border border-ink-700/70 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-50">
          {name.trim()} is live
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Deployed on {LAUNCH_CHAIN.name}. The journey document is committed
          on-chain via its hash.
        </p>
        <p className="mt-4 break-all font-mono text-xs text-ink-400">{status.token}</p>
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
            {([1, 2, 3] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={s === 2 && !step1Valid ? true : s === 3 && (!step1Valid || !!journeyProblem)}
                onClick={() => setStep(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  step === s
                    ? "bg-electric-500/20 text-electric-200 border border-electric-500/50"
                    : "border border-ink-700/70 text-ink-400 hover:text-ink-200",
                )}
              >
                {s}. {s === 1 ? "Details" : s === 2 ? "Journey" : "Launch"}
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
              label="Total supply"
              required
              error={supplyError}
              hint="Whole tokens, minted to you at launch. 18 decimals on-chain."
            >
              <Input
                inputMode="numeric"
                value={supply}
                placeholder="1000000"
                className="tabular"
                onChange={(e) => setSupply(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </Field>

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

            <div className="rounded-xl border border-ink-700/60 bg-ink-950/50 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium text-ink-100">
                    Vest part of the supply
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    Locks a share in an on-chain vesting wallet, released
                    linearly to you after an optional cliff.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={vestingOn}
                  onChange={(e) => setVestingOn(e.target.checked)}
                  className="h-4 w-4 accent-electric-500"
                />
              </label>

              {vestingOn ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Field label="Vested share" error={undefined} hint="% of supply">
                    <Input
                      inputMode="numeric"
                      value={vestPercent}
                      className="tabular"
                      onChange={(e) => setVestPercent(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </Field>
                  <Field label="Duration" error={undefined} hint="days">
                    <Input
                      inputMode="numeric"
                      value={vestDays}
                      className="tabular"
                      onChange={(e) => setVestDays(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </Field>
                  <Field label="Cliff" error={undefined} hint="days (0 = none)">
                    <Input
                      inputMode="numeric"
                      value={cliffDays}
                      className="tabular"
                      onChange={(e) => setCliffDays(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </Field>
                  {vestingError ? (
                    <p className="text-xs text-rose-400 sm:col-span-3">{vestingError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

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

            <div className="flex items-center justify-end border-t border-ink-800/70 pt-5">
              <Button size="sm" disabled={!step1Valid} onClick={() => setStep(2)}>
                Next: Journey
              </Button>
            </div>
          </div>
        ) : step === 2 ? (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ink-300">
              The journey is your public commitment: why this token exists, why
              the supply is what it is, and what happens next. Its hash goes
              on-chain with the launch — the document can never be quietly
              rewritten.
            </p>
            <JourneyFields
              why={why}
              supplyRationale={supplyRationale}
              milestones={milestones}
              onWhy={setWhy}
              onSupplyRationale={setSupplyRationale}
              onMilestones={setMilestones}
            />
            <div className="flex items-center justify-between border-t border-ink-800/70 pt-5">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                {journeyProblem && (why || supplyRationale) ? (
                  <span className="text-xs text-ink-500">{journeyProblem}</span>
                ) : null}
                <Button size="sm" disabled={!!journeyProblem} onClick={() => setStep(3)}>
                  Next: Launch
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
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
                  {vestingOn
                    ? `${Number(supply || 0).toLocaleString("en-US")} — ${vestingNums.percent}% vested over ${vestingNums.durationDays}d (${vestingNums.cliffDays}d cliff), rest to your wallet`
                    : `${Number(supply || 0).toLocaleString("en-US")} → your wallet`}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Journey</span>
                <span className="text-ink-100">{milestones.length} milestones, hash committed on-chain</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Network</span>
                <span className="text-ink-100">{LAUNCH_CHAIN.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-ink-500">Launch fee</span>
                <span className="text-ink-100">
                  {launchFee === undefined
                    ? "—"
                    : launchFee === 0n
                      ? "Free"
                      : `${formatEther(launchFee)} ETH`}
                </span>
              </div>
            </div>

            <p className="break-all font-mono text-xs text-ink-500">
              journeyHash: {journeyProblem ? "—" : hashJourney(journeyDoc)}
            </p>

            {status.kind === "error" ? (
              <StatusChip variant="block" tone="error">
                {status.message}
              </StatusChip>
            ) : null}

            <div className="flex items-center justify-between border-t border-ink-800/70 pt-5">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
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
        />
      </div>
    </div>
  );
}
