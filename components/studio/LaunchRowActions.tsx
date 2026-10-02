"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cable } from "lucide-react";

import { LaunchAgentModal } from "@/components/launch/LaunchAgentModal";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { LAUNCH_PROJECT_COPY, MCP_CONNECT } from "@/content/launch";
import { cn } from "@/lib/utils";

export interface LaunchLinkProject {
  id: string;
  name: string;
  hasKit: boolean;
}

/** PATCH /api/launches/<address>. Throws with the server's message. */
export async function patchLaunchProject(
  address: string,
  body: { projectId: string | null } | { createProject: true },
): Promise<{ project: { id: string; name: string } | null }> {
  const res = await fetch(`/api/launches/${address}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? LAUNCH_PROJECT_COPY.failed);
  return { project: json.project ?? null };
}

/**
 * The controls on one studio launch row (M56). The agent prompt popup, and
 * the project link: link, change, unlink, or start a project for the token.
 * `candidates` are the account's projects on the launch's chain.
 */
export function LaunchRowActions({
  address,
  name,
  committed,
  linkable,
  project,
  candidates,
  onChanged,
}: {
  address: string;
  name?: string;
  committed: boolean;
  /** False for a launch known only through a token design, which links through the design. */
  linkable: boolean;
  project: LaunchLinkProject | null;
  candidates: LaunchLinkProject[];
  /** Called after the link changed, for a host that holds its own copy. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [promptOpen, setPromptOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const others = candidates.filter((c) => c.id !== project?.id);

  async function change(body: { projectId: string | null } | { createProject: true }) {
    setWorking(true);
    setError(null);
    try {
      const { project: linked } = await patchLaunchProject(address, body);
      setPanelOpen(false);
      setChoice("");
      onChanged?.();
      if ("createProject" in body && linked) router.push(`/studio/project/${linked.id}`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : LAUNCH_PROJECT_COPY.failed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        {linkable ? (
          <Button size="sm" variant="ghost" onClick={() => setPanelOpen((v) => !v)} aria-expanded={panelOpen}>
            {project ? LAUNCH_PROJECT_COPY.change : LAUNCH_PROJECT_COPY.linkTitle}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => setPromptOpen(true)}>
          <Cable aria-hidden className="h-3.5 w-3.5" /> {MCP_CONNECT.openPrompt}
        </Button>
      </div>

      {panelOpen ? (
        <div className="basis-full border-t border-ink-800/70 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            {others.length > 0 ? (
              <>
                <select
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                  aria-label={LAUNCH_PROJECT_COPY.linkTitle}
                  className={cn(inputClasses, "max-w-xs appearance-none", !choice && "text-ink-500")}
                >
                  <option value="" disabled>
                    {LAUNCH_PROJECT_COPY.choose}
                  </option>
                  {others.map((c) => (
                    <option key={c.id} value={c.id} className="bg-ink-950 text-ink-50">
                      {c.name || "Untitled"}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!choice || working}
                  onClick={() => void change({ projectId: choice })}
                >
                  {LAUNCH_PROJECT_COPY.linkTitle}
                </Button>
              </>
            ) : null}
            {!project ? (
              <Button size="sm" disabled={working} onClick={() => void change({ createProject: true })}>
                {LAUNCH_PROJECT_COPY.startForToken}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" disabled={working} onClick={() => void change({ projectId: null })}>
                {LAUNCH_PROJECT_COPY.unlink}
              </Button>
            )}
          </div>
          {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
        </div>
      ) : null}

      <LaunchAgentModal
        open={promptOpen}
        onClose={() => setPromptOpen(false)}
        address={address}
        name={name}
        committed={committed}
        project={project}
      />
    </>
  );
}
