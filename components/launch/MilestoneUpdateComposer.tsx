"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicClient, useWriteContract } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, TextArea, inputClasses } from "@/components/ui/Input";
import { journeyUpdatesAbi } from "@/lib/abi/journeyUpdates";
import { LAUNCH_CHAIN } from "@/content/launch";
import {
  hashMilestoneUpdate,
  UPDATE_LIMITS,
  type MilestoneUpdateDoc,
} from "@/lib/journey";
import { cn } from "@/lib/utils";

import { useLaunchChain } from "./useLaunchChain";

type Status =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "done" };

/**
 * Creator-only progress update composer. The body is stored content-addressed
 * via /api/milestone-updates, then its hash is anchored on-chain with
 * JourneyUpdates.postUpdate — same store-then-commit order as the launch flow,
 * so the anchor can always be served.
 */
export function MilestoneUpdateComposer({
  tokenAddress,
  creator,
  milestoneTitles,
}: {
  tokenAddress: string;
  creator: string;
  milestoneTitles: string[];
}) {
  const router = useRouter();
  const { address, ensureChain } = useLaunchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Connect state (incl. the button) lives in EscrowActions right above this
  // component — the composer only appears once the creator is connected.
  if (!address || address.toLowerCase() !== creator.toLowerCase()) return null;

  async function post() {
    if (status.kind === "working") return;
    try {
      const trimmed = body.trim();
      if (trimmed.length === 0) throw new Error("Write the update first.");
      if (trimmed.length > UPDATE_LIMITS.body.max)
        throw new Error(`Keep updates under ${UPDATE_LIMITS.body.max} characters.`);

      setStatus({ kind: "working", label: "Checking network…" });
      if (!(await ensureChain())) throw new Error(`Switch to ${LAUNCH_CHAIN.name} to continue.`);

      const doc: MilestoneUpdateDoc = {
        version: 1,
        token: tokenAddress.toLowerCase(),
        milestoneIndex,
        body: trimmed,
      };
      const updateHash = hashMilestoneUpdate(doc);

      setStatus({ kind: "working", label: "Storing the update…" });
      const res = await fetch("/api/milestone-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc, clientHash: updateHash, author: address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Storing the update failed.");

      setStatus({ kind: "working", label: "Confirm the anchor in your wallet…" });
      const txHash = await writeContractAsync({
        abi: journeyUpdatesAbi,
        address: LAUNCH_CHAIN.updatesAddress,
        functionName: "postUpdate",
        args: [tokenAddress as `0x${string}`, milestoneIndex, updateHash],
      });

      setStatus({ kind: "working", label: "Waiting for confirmation…" });
      if (!publicClient) throw new Error("No RPC client.");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("Transaction reverted.");

      setStatus({ kind: "done" });
      setBody("");
      setTimeout(() => router.refresh(), 4000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "Something went wrong.";
      setStatus({ kind: "error", message });
    }
  }

  return (
    <div className="card-surface mt-4 rounded-2xl border border-ink-700/70 p-5">
      <p className="text-sm text-ink-300">
        Post a progress update — stored content-addressed, hash anchored on-chain.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr]">
        <Field label="Milestone" error={undefined}>
          <select
            value={milestoneIndex}
            onChange={(e) => setMilestoneIndex(Number(e.target.value))}
            className={cn(inputClasses, "appearance-none")}
          >
            {milestoneTitles.map((t, i) => (
              <option key={i} value={i}>
                M{i + 1} — {t}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Update"
          error={undefined}
          counter={`${body.length}/${UPDATE_LIMITS.body.max}`}
        >
          <TextArea
            rows={2}
            maxLength={UPDATE_LIMITS.body.max}
            value={body}
            placeholder="What shipped, what changed, how to verify it…"
            className="resize-none"
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" disabled={status.kind === "working"} onClick={() => void post()}>
          {status.kind === "working" ? "Posting…" : "Post update"}
        </Button>
        {status.kind === "working" ? (
          <span className="text-xs text-ink-400">{status.label}</span>
        ) : null}
      </div>
      {status.kind === "error" ? (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {status.message}
        </p>
      ) : null}
      {status.kind === "done" ? (
        <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Update anchored. Page refreshes in a few seconds.
        </p>
      ) : null}
    </div>
  );
}
