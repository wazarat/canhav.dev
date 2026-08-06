"use client";

import Link from "next/link";
import { useState } from "react";
import { useSignMessage } from "wagmi";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { buildAttachMessage } from "@/lib/attach-proof";

import { ConnectButton } from "./ConnectButton";
import { useLaunchChain } from "./useLaunchChain";

type FlowStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "error"; message: string }
  | { kind: "success" };

/**
 * Manual attach: for tokens deployed outside the prefilled launch flow (or
 * attached later). The deployer wallet signs an ownership proof; the server
 * additionally verifies the on-chain journeyHash commits to this design.
 */
export function AttachDeployFlow({ designId }: { designId: string }) {
  const [tokenAddress, setTokenAddress] = useState("");
  const [status, setStatus] = useState<FlowStatus>({ kind: "idle" });
  const { isConnected, address } = useLaunchChain();
  const { signMessageAsync } = useSignMessage();

  const addressValid = /^0x[0-9a-fA-F]{40}$/.test(tokenAddress.trim());

  async function attach() {
    if (status.kind === "working") return;
    try {
      if (!isConnected || !address) throw new Error("Connect the wallet that deployed the token.");
      const addr = tokenAddress.trim().toLowerCase();

      setStatus({ kind: "working", label: "Sign the ownership proof in your wallet…" });
      const signedAt = Math.floor(Date.now() / 1000);
      const signature = await signMessageAsync({
        message: buildAttachMessage(addr, designId, signedAt),
      });

      setStatus({ kind: "working", label: "Verifying…" });
      const res = await fetch(`/api/ideation/token-designs/${designId}/attach-deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenAddress: addr, signature, signedAt }),
      });
      const json = await res.json();
      if (res.status === 401)
        throw new Error("Sign in at /studio first — the design record belongs to your account.");
      if (!res.ok) throw new Error(json.error ?? "Attach failed.");
      setStatus({ kind: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "Something went wrong.";
      setStatus({ kind: "error", message });
    }
  }

  if (status.kind === "success") {
    return (
      <StatusChip tone="success" variant="block">
        Attached. The design record now points at the deployed contract —{" "}
        <Link
          href={`/studio/token/${designId}`}
          className="text-electric-300 transition-colors hover:text-electric-200"
        >
          back to the editor →
        </Link>
      </StatusChip>
    );
  }

  return (
    <div className="glass max-w-xl space-y-5 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-300">
          Connect the wallet that deployed the token, paste the contract
          address, and sign a short message. The signature plus the on-chain
          design-hash commitment are both verified before anything attaches.
        </p>
      </div>
      <ConnectButton />
      <Field label="Token contract address" required>
        <Input
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value.trim())}
          placeholder="0x…"
          className="font-mono text-xs"
        />
      </Field>
      {status.kind === "error" && (
        <StatusChip tone="error" variant="block">
          {status.message}
        </StatusChip>
      )}
      <div className="flex items-center gap-3">
        <Button
          disabled={!isConnected || !addressValid || status.kind === "working"}
          onClick={() => void attach()}
        >
          {status.kind === "working" ? "Working…" : "Sign & attach"}
        </Button>
        {status.kind === "working" && (
          <span className="text-xs text-ink-400">{status.label}</span>
        )}
      </div>
    </div>
  );
}
