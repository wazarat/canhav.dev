"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { STUDIO_COPY } from "@/content/ideation";

/**
 * Deletes a draft project or token design from the studio list. Two clicks,
 * the second on an inline confirmation, then DELETE on the entity route
 * (drafts only, server-enforced) and a refresh of the server-rendered list.
 * Published rows never render this; they are unpublished from their editor.
 */
export function DeleteDraftButton({
  entity,
  id,
  name,
}: {
  entity: "projects" | "token-designs";
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "confirm" | "busy" | "failed">("idle");
  const copy = STUDIO_COPY.delete;

  async function remove() {
    setPhase("busy");
    try {
      const res = await fetch(`/api/ideation/${entity}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.refresh();
    } catch {
      setPhase("failed");
    }
  }

  if (phase === "idle") {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setPhase("confirm")}
        className="h-8 px-2.5 text-xs text-ink-400 hover:text-ink-50"
        aria-label={`${copy.action} ${name || "draft"}`}
      >
        <Trash2 aria-hidden className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{copy.action}</span>
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs" role="group" aria-label={copy.action}>
      {phase === "failed" ? (
        <span className="text-rose-400">{copy.failed}</span>
      ) : (
        <span className="text-ink-300">{copy.confirm(name || "Untitled")}</span>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={remove}
        disabled={phase === "busy"}
        className="h-8 px-3 text-xs"
      >
        {phase === "busy" ? copy.busy : copy.yes}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setPhase("idle")}
        disabled={phase === "busy"}
        className="h-8 px-2.5 text-xs text-ink-400 hover:text-ink-50"
      >
        {copy.no}
      </Button>
    </div>
  );
}
