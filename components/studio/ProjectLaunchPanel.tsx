"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cable } from "lucide-react";

import { LaunchAgentModal } from "@/components/launch/LaunchAgentModal";
import { patchLaunchProject } from "@/components/studio/LaunchRowActions";
import { Button } from "@/components/ui/Button";
import { InfoTip } from "@/components/ui/InfoTip";
import { Input } from "@/components/ui/Input";
import { Select, optionClasses } from "@/components/ui/Select";
import { StatusChip } from "@/components/ui/StatusChip";
import { MAINNET_COPY } from "@/content/ideation";
import { LAUNCH_PROJECT_COPY, MCP_CONNECT } from "@/content/launch";
import type { MainnetView } from "@/lib/mainnet-view";
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
  venueLine = null,
  mainnet = null,
  className,
  showMainnet = true,
}: {
  project: { id: string; name: string; hasKit: boolean };
  linked: PanelLaunch[];
  /** The account's launches on this project's chain with no project yet. */
  candidates: PanelLaunch[];
  /** The linked design's launch venue in one line (M69). */
  venueLine?: string | null;
  /** The mainnet contracts and the Pons pairing the project records (M70). */
  mainnet?: MainnetView | null;
  /** Replaces the default outer surface and margin (the Studio project page passes its own, M94). */
  className?: string;
  /** False on the Studio project page, where Deployments owns the mainnet record. */
  showMainnet?: boolean;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PanelLaunch | null>(null);

  const [pasted, setPasted] = useState("");

  /** Link by a pasted reference (M89), the same rule the agent's link_launch applies. */
  async function linkPasted() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/launches/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ref: pasted, projectId: project.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? LAUNCH_PROJECT_COPY.failed);
      setPasted("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : LAUNCH_PROJECT_COPY.failed);
    } finally {
      setWorking(false);
    }
  }

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
    <div
      id={LAUNCH_PROJECT_COPY.panelAnchor}
      className={cn("scroll-mt-28", className ?? "glass mt-6 max-w-2xl rounded-xl border border-ink-800/70 p-5")}
    >
      <h3 className="text-sm font-medium text-ink-100">{LAUNCH_PROJECT_COPY.panelTitle}</h3>
      <p className="mt-1 text-xs text-ink-500">{LAUNCH_PROJECT_COPY.panelLead}</p>
      {venueLine ? <p className="mt-2 text-xs text-ink-300">{venueLine}</p> : null}

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
            <Select
              value={choice}
              muted={!choice}
              onChange={(e) => setChoice(e.target.value)}
              aria-label={LAUNCH_PROJECT_COPY.panelLink}
              className="max-w-xs"
            >
              <option value="" disabled>
                {LAUNCH_PROJECT_COPY.panelChoose}
              </option>
              {candidates.map((c) => (
                <option key={c.address} value={c.address} className={optionClasses}>
                  {c.name}
                  {c.symbol ? ` $${c.symbol}` : ""}
                </option>
              ))}
            </Select>
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

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={LAUNCH_PROJECT_COPY.panelPastePlaceholder}
            aria-label={LAUNCH_PROJECT_COPY.panelPaste}
            className="max-w-xs font-mono text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && pasted.trim() && !working) {
                e.preventDefault();
                void linkPasted();
              }
            }}
          />
          <Button size="sm" variant="outline" disabled={!pasted.trim() || working} onClick={() => void linkPasted()}>
            {LAUNCH_PROJECT_COPY.panelPasteButton}
          </Button>
          <InfoTip>{LAUNCH_PROJECT_COPY.panelPasteHint}</InfoTip>
        </div>

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

      {showMainnet ? (
      <div className="mt-5 border-t border-ink-800/70 pt-4">
        <h4 className="text-xs font-medium text-ink-200">{MAINNET_COPY.panelTitle}</h4>
        {mainnet ? (
          <div className="mt-2 space-y-2 text-xs">
            <StatusChip tone="neutral">{MAINNET_COPY.chainLine(mainnet.chainName, mainnet.chainId)}</StatusChip>
            {mainnet.contracts.map((c) => (
              <div key={c.address} className="flex flex-wrap items-center gap-2">
                <span className="text-ink-300">{c.label || c.address.slice(0, 10)}</span>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-electric-300 transition-colors hover:text-electric-200"
                >
                  {c.address.slice(0, 6)}…{c.address.slice(-4)}
                </a>
              </div>
            ))}
            {mainnet.companion ? <p className="text-ink-300">{MAINNET_COPY.companionLine(mainnet.companion.name)}</p> : null}
            {mainnet.pons ? (
              <p className="text-ink-300">
                {MAINNET_COPY.ponsLine}{" "}
                <a href={mainnet.pons.tokenUrl} target="_blank" rel="noreferrer" className="font-mono text-electric-300 hover:text-electric-200">
                  {mainnet.pons.tokenAddress.slice(0, 6)}…{mainnet.pons.tokenAddress.slice(-4)}
                </a>
                . {MAINNET_COPY.feeLine}{" "}
                <a href={mainnet.pons.feeUrl} target="_blank" rel="noreferrer" className="font-mono text-electric-300 hover:text-electric-200">
                  {mainnet.pons.feeRecipient.slice(0, 6)}…{mainnet.pons.feeRecipient.slice(-4)}
                </a>
              </p>
            ) : null}
            {mainnet.pair ? (
              <p className="text-ink-300">
                {MAINNET_COPY.pairLine(mainnet.pair.venueLabel, mainnet.pair.quoteAsset)}.{" "}
                <a href={mainnet.pair.url} target="_blank" rel="noreferrer" className="text-electric-300 hover:text-electric-200">
                  {MAINNET_COPY.pairTrade(mainnet.pair.venueLabel)}
                </a>
                {mainnet.pair.pairAddress && mainnet.pair.pairUrl ? (
                  <>
                    {" · "}
                    <a href={mainnet.pair.pairUrl} target="_blank" rel="noreferrer" className="font-mono text-electric-300 hover:text-electric-200">
                      {mainnet.pair.pairAddress.slice(0, 6)}…{mainnet.pair.pairAddress.slice(-4)}
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-xs text-ink-500">{MAINNET_COPY.panelNone}</p>
        )}
      </div>
      ) : null}

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
