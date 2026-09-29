"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { StatusChip } from "@/components/ui/StatusChip";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";

/**
 * On the launch success screen: link the new token to the signed-in CanHav
 * account so get_my_launches can list it. Best effort and one shot. Signed
 * out, it only points at sign-in. The server re-reads the token from the
 * indexer before storing anything (app/api/launches/route.ts).
 */
type LinkState = "idle" | "linking" | "linked" | "failed";

function SignedOutHint() {
  return (
    <p className="mt-3 text-xs text-ink-500">
      <Link href="/studio" className="text-electric-300 transition-colors hover:text-electric-200">
        Sign in
      </Link>{" "}
      before your next launch and your agent can list it with get_my_launches.
    </p>
  );
}

interface LinkerProps {
  tokenAddress: string;
  txHash: string;
  /** The studio project the launch was started from, recorded on the row. */
  projectId?: string;
  projectName?: string;
}

function Linker({ tokenAddress, txHash, projectId, projectName }: LinkerProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [state, setState] = useState<LinkState>("idle");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || state !== "idle") return;
    setState("linking");
    fetch("/api/launches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenAddress, txHash, projectId: projectId ?? null }),
    })
      .then((res) => setState(res.ok || res.status === 409 ? "linked" : "failed"))
      .catch(() => setState("failed"));
  }, [isLoaded, isSignedIn, state, tokenAddress, txHash, projectId]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignedOutHint />;
  if (state === "linked")
    return (
      <div className="mt-3">
        <StatusChip tone="success" variant="pill">
          {projectName
            ? `Linked to your CanHav account and to ${projectName}. get_my_launches will list it.`
            : "Linked to your CanHav account. get_my_launches will list it."}
        </StatusChip>{" "}
        <Link
          href="/studio"
          className="text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          See it in the studio →
        </Link>
      </div>
    );
  if (state === "failed")
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <StatusChip tone="neutral" variant="pill">
          Could not link this launch to your account. It is still readable by address.
        </StatusChip>
        <StatusChip tone="info" variant="pill" onClick={() => setState("idle")}>
          Retry
        </StatusChip>
      </div>
    );
  return <p className="mt-3 text-xs text-ink-500">Linking to your account…</p>;
}

export function AccountLink(props: LinkerProps) {
  // Config is fixed per build, so the hook component mounts consistently.
  if (!isAuthConfiguredClient()) return null;
  return <Linker {...props} />;
}
