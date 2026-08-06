"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { inputClasses } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface LinkCandidate {
  id: string;
  name: string;
}

export interface LinkedSummary {
  id: string;
  name: string;
  status: "draft" | "published";
  slug: string | null;
}

/**
 * Link/unlink the other track's record. Linking is a user action, reversible
 * from either side; the public cross-cards appear only once both sides are
 * published.
 */
export function LinkPanel({
  selfType,
  selfId,
  linked,
  candidates,
}: {
  selfType: "project" | "token_design";
  selfId: string;
  linked: LinkedSummary | null;
  candidates: LinkCandidate[];
}) {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherLabel = selfType === "project" ? "token design" : "project";

  async function mutate(method: "POST" | "DELETE", otherId: string) {
    setWorking(true);
    setError(null);
    const body =
      selfType === "project"
        ? { projectId: selfId, tokenDesignId: otherId }
        : { projectId: otherId, tokenDesignId: selfId };
    try {
      const res = await fetch("/api/ideation/links", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Link change failed.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Link change failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="glass mt-10 max-w-2xl rounded-2xl border border-ink-800/70 p-5">
      <h3 className="text-sm font-medium text-ink-100">
        Linked {otherLabel}
      </h3>
      <p className="mt-1 text-xs text-ink-500">
        Neither track needs the other. Linked records reference each other on
        their public pages — a card each way, no merged evidence.
      </p>
      <div className="mt-4">
        {linked ? (
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone={linked.status === "published" ? "success" : "neutral"}>
              {linked.name} · {linked.status === "published" ? "published" : "draft"}
            </StatusChip>
            <Button
              size="sm"
              variant="ghost"
              disabled={working}
              onClick={() => mutate("DELETE", linked.id)}
            >
              Unlink
            </Button>
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-xs text-ink-500">
            No {otherLabel}s in your studio yet — create one and link it here.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className={cn(inputClasses, "max-w-xs appearance-none", !choice && "text-ink-500")}
            >
              <option value="" disabled>
                Choose a {otherLabel}…
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink-950 text-ink-50">
                  {c.name || "Untitled"}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!choice || working}
              onClick={() => mutate("POST", choice)}
            >
              {working ? "Linking…" : "Link"}
            </Button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
