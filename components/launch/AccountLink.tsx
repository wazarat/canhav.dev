"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { StatusChip } from "@/components/ui/StatusChip";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";
import { LAUNCH_PROJECT_COPY } from "@/content/launch";

/**
 * On the launch success screen: link the new token to the signed-in CanHav
 * account so get_my_launches can list it, and to the project picked on the
 * form, or to a new draft started for the token (M56). Best effort. Signed
 * out, it only points at sign-in. The server re-reads the token from the
 * indexer before storing anything (app/api/launches/route.ts).
 */
type LinkState =
  | { kind: "idle" }
  | { kind: "linking" }
  | { kind: "linked"; project: LinkedProject | null }
  | { kind: "failed"; message: string | null };

export interface LinkedProject {
  id: string;
  name: string;
}

/** The indexer may lag the receipt, so "not indexed yet" is tried again. */
const INDEX_RETRIES = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function SignedOutHint() {
  return (
    <p className="mt-3 text-xs text-ink-500">
      <Link href="/studio" className="text-electric-300 transition-colors hover:text-electric-200">
        Sign in
      </Link>{" "}
      {AUTH_COPY.launchSignedOut}
    </p>
  );
}

interface LinkerProps {
  tokenAddress: string;
  txHash: string;
  /** The studio project the launch is linked to, recorded on the row. */
  projectId?: string;
  projectName?: string;
  /** Start a draft project for the token instead, from its description. */
  createProject?: { description: string };
  /** Called once the link is stored, with the project when there is one. */
  onLinked?: (project: LinkedProject | null) => void;
}

function Linker({ tokenAddress, txHash, projectId, projectName, createProject, onLinked }: LinkerProps) {
  const { isLoaded, isSignedIn } = useUser();
  const [state, setState] = useState<LinkState>({ kind: "idle" });
  const onLinkedRef = useRef(onLinked);
  onLinkedRef.current = onLinked;
  const description = createProject?.description;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || state.kind !== "idle") return;
    setState({ kind: "linking" });
    const known = projectId ? { id: projectId, name: projectName ?? "" } : null;
    (async () => {
      for (let attempt = 0; ; attempt++) {
        const res = await fetch("/api/launches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenAddress,
            txHash,
            projectId: projectId ?? null,
            ...(description !== undefined && !projectId ? { createProject: { description } } : {}),
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          project?: LinkedProject | null;
        };
        if (res.ok) return json.project ?? known;
        // Already recorded by this account on an earlier try.
        if (res.status === 409 && json.code === "exists") return known;
        if (res.status === 409 && json.code === "not_indexed" && attempt < INDEX_RETRIES) {
          await sleep(4000);
          continue;
        }
        throw new Error(json.error ?? "");
      }
    })()
      .then((project) => {
        setState({ kind: "linked", project });
        onLinkedRef.current?.(project);
      })
      .catch((err: unknown) =>
        setState({ kind: "failed", message: err instanceof Error && err.message ? err.message : null }),
      );
  }, [isLoaded, isSignedIn, state.kind, tokenAddress, txHash, projectId, projectName, description]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <SignedOutHint />;
  if (state.kind === "linked") {
    const project = state.project;
    return (
      <div className="mt-3">
        <StatusChip tone="success" variant="pill">
          {project
            ? `Linked to your CanHav account and to ${project.name || "a new project"}. get_my_launches will list it.`
            : "Linked to your CanHav account. get_my_launches will list it."}
        </StatusChip>{" "}
        <Link
          href={project ? `/studio/project/${project.id}` : "/studio"}
          className="text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          {project ? LAUNCH_PROJECT_COPY.openProject : "See it in the studio"} →
        </Link>
      </div>
    );
  }
  if (state.kind === "failed")
    return (
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <StatusChip tone="neutral" variant="pill">
          {state.message ??
            "Could not link this launch to your account. It is still readable by address."}
        </StatusChip>
        <StatusChip tone="info" variant="pill" onClick={() => setState({ kind: "idle" })}>
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
