"use client";

import { useState } from "react";

export type PublishStatus =
  | { kind: "idle" }
  | { kind: "working"; label: string }
  | { kind: "published"; slug: string; hash: string; version: number }
  | { kind: "unpublished" }
  | { kind: "error"; message: string };

/** Publish/unpublish against the ideation API for one entity. */
export function usePublish(entity: "projects" | "token-designs", id: string) {
  const [status, setStatus] = useState<PublishStatus>({ kind: "idle" });

  async function publish() {
    setStatus({ kind: "working", label: "Publishing…" });
    try {
      const res = await fetch(`/api/ideation/${entity}/${id}/publish`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Publish failed.");
      setStatus({ kind: "published", slug: body.slug, hash: body.hash, version: body.version });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Publish failed." });
    }
  }

  async function unpublish() {
    setStatus({ kind: "working", label: "Unpublishing…" });
    try {
      const res = await fetch(`/api/ideation/${entity}/${id}/publish`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Unpublish failed.");
      setStatus({ kind: "unpublished" });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Unpublish failed." });
    }
  }

  return { status, publish, unpublish };
}
