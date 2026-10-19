"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

/**
 * The welcome page's move list (M108): the account's personal projects
 * with a checkbox each, moved to the active team in one go through the
 * M107 team route.
 */
export function WelcomeMove({ projects }: { projects: Array<{ id: string; name: string }> }) {
  const W = STUDIO_PLUS_COPY.welcome;
  const [picked, setPicked] = useState<Set<string>>(new Set(projects.map((p) => p.id)));
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [moved, setMoved] = useState(0);
  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const move = async () => {
    setState("busy");
    let ok = 0;
    let failed = false;
    for (const id of picked) {
      const res = await fetch(`/api/ideation/projects/${id}/team`, { method: "POST" });
      if (res.ok) ok += 1;
      else failed = true;
    }
    setMoved(ok);
    setState(failed ? "failed" : "done");
  };
  return (
    <Card className="max-w-2xl">
      <CardSection className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink-50">{W.moveTitle}</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-ink-400">{W.moveNone}</p>
        ) : state === "done" ? (
          <StatusChip tone="success">{W.moved(moved)}</StatusChip>
        ) : (
          <>
            <ul className="space-y-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-200">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink-600 bg-ink-900"
                      checked={picked.has(p.id)}
                      onChange={() => toggle(p.id)}
                      disabled={state === "busy"}
                    />
                    <span className="truncate">{p.name || "Untitled"}</span>
                  </label>
                </li>
              ))}
            </ul>
            {state === "failed" ? <p className="text-xs text-rose-400">{W.moveFailed}</p> : null}
            <Button size="sm" onClick={() => void move()} disabled={state === "busy" || picked.size === 0}>
              {state === "busy" ? W.moving : W.moveSelected(picked.size)}
            </Button>
          </>
        )}
      </CardSection>
    </Card>
  );
}
