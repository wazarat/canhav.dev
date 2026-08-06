"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { STUDIO_COPY } from "@/content/ideation";

/** Creates a blank draft via the API and jumps into its editor. */
export function NewEntityButtons() {
  const router = useRouter();
  const [working, setWorking] = useState<"project" | "token" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(kind: "project" | "token") {
    setWorking(kind);
    setError(null);
    try {
      const res = await fetch(
        kind === "project" ? "/api/ideation/projects" : "/api/ideation/token-designs",
        { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create a draft.");
      router.push(kind === "project" ? `/studio/project/${body.id}` : `/studio/token/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a draft.");
      setWorking(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => create("project")} disabled={working !== null}>
        {working === "project" ? "Creating…" : STUDIO_COPY.newProject}
      </Button>
      <Button variant="outline" onClick={() => create("token")} disabled={working !== null}>
        {working === "token" ? "Creating…" : STUDIO_COPY.newTokenDesign}
      </Button>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
