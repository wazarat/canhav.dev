"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cable } from "lucide-react";

import { LaunchAgentModal } from "@/components/launch/LaunchAgentModal";
import { patchLaunchProject } from "@/components/studio/LaunchRowActions";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { LAUNCH_PROJECT_COPY, MCP_CONNECT } from "@/content/launch";
import { cn } from "@/lib/utils";

export interface PanelLaunch {
  address: string;
  name: string;
  symbol: string | null;
  committed: boolean;
}

/**
 * The token launch side of a studio project (M56). Shows the launches linked
 * to the project, each with its agent prompt and an unlink, and links one of
 * the account's unlinked launches on the same chain.
 */
export function ProjectLaunchPanel({
  project,
  linked,
  candidates,
}: {
  project: { id: string; name: string; hasKit: boolean };
  linked: PanelLaunch[];
  /** The account's launches on this project's chain with no project yet. */
  candidates: PanelLaunch[];
}) {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PanelLaunch | null>(null);

  async function change(address: string, projectId: string | null) {
    setWorking(true);
    setError(null);
    try {
      await patchLaunchProject(address, { projectId });
      setChoice("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : LAUNCH_PROJECT_COPY.failed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="glass mt-6 max-w-2xl rounded-2xl border border-ink-800/70 p-5">
      <h3 className="text-sm font-medium text-ink-100">{LAUNCH_PROJECT_COPY.panelTitle}</h3>
      <p className="mt-1 text-xs text-ink-500">{LAUNCH_PROJECT_COPY.panelLead}</p>

      <div className="mt-4 space-y-3">
        {linked.length === 0 ? (
          <p className="text-sm text-ink-400">{LAUNCH_PROJECT_COPY.panelNone}</p>
        ) : (
          linked.map((l) => (
            <div key={l.address} className="flex flex-wrap items-center gap-3">
              <StatusChip tone="success">
                {l.name}
                {l.symbol ? ` $${l.symbol}` : ""}
              </StatusChip>
              <Link
                href={`/launch/t/${l.address}`}
                className="font-mono text-xs text-electric-300 transition-colors hover:text-electric-200"
              >
                {l.address.slice(0, 6)}…{l.address.slice(-4)}
              </Link>
              <Button size="sm" variant="outline" onClick={() => setPrompt(l)}>
                <Cable aria-hidden className="h-3.5 w-3.5" /> {MCP_CONNECT.openPrompt}
              </Button>
              <Button size="sm" variant="ghost" disabled={working} onClick={() => void change(l.address, null)}>
                {LAUNCH_PROJECT_COPY.unlink}
              </Button>
            </div>
          ))
        )}

        {candidates.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              aria-label={LAUNCH_PROJECT_COPY.panelLink}
              className={cn(inputClasses, "max-w-xs appearance-none", !choice && "text-ink-500")}
            >
              <option value="" disabled>
                {LAUNCH_PROJECT_COPY.panelChoose}
              </option>
              {candidates.map((c) => (
                <option key={c.address} value={c.address} className="bg-ink-950 text-ink-50">
                  {c.name}
                  {c.symbol ? ` $${c.symbol}` : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!choice || working}
              onClick={() => void change(choice, project.id)}
            >
              {LAUNCH_PROJECT_COPY.panelLink}
            </Button>
          </div>
        ) : null}

        {linked.length === 0 ? (
          <Link
            href={`/launch?project=${project.id}`}
            className="inline-block text-xs text-electric-300 transition-colors hover:text-electric-200"
          >
            {LAUNCH_PROJECT_COPY.panelLaunch} →
          </Link>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}

      <LaunchAgentModal
        open={prompt !== null}
        onClose={() => setPrompt(null)}
        address={prompt?.address ?? ""}
        name={prompt?.name}
        committed={prompt?.committed ?? false}
        project={project}
      />
    </div>
  );
}
