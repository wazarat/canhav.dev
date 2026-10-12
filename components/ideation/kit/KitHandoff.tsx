"use client";

import Link from "next/link";
import { Download, Rocket } from "lucide-react";

import { CopyLine } from "@/components/ui/CopyLine";
import { InfoTip } from "@/components/ui/InfoTip";
import { HANDOFF_COPY } from "@/content/kits/copy";
import { MCP_CONNECT } from "@/content/launch";

/**
 * "Get this into your IDE" on the Review step. Two downloads from the draft
 * export route (sign-in gated, the route bounces and returns) and the MCP
 * prompt that makes an agent load the pack. Static apart from the project id
 * and name.
 */
export function KitHandoff({
  projectId,
  name,
  venueLine = null,
}: {
  projectId: string;
  name: string;
  /** The linked design's launch venue in one line (M69). Null when no design or no venue. */
  venueLine?: string | null;
}) {
  const base = `/api/export/project/${projectId}`;
  const cls =
    "inline-flex items-center gap-1.5 rounded-md border border-ink-700/60 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:border-electric-500/50 hover:text-electric-300";
  return (
    <section className="glass mt-6 rounded-xl p-5" aria-label={HANDOFF_COPY.title}>
      <h3 className="inline-flex items-center gap-1 font-display text-sm font-semibold text-ink-50">
        {HANDOFF_COPY.title}
        <InfoTip>
          <span className="block">{HANDOFF_COPY.intro}</span>
          <span className="mt-2 block text-ink-400">{HANDOFF_COPY.footnote}</span>
        </InfoTip>
      </h3>
      {venueLine ? <p className="mt-2 text-xs leading-relaxed text-ink-300">{venueLine}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={`${base}?file=resources`} className={cls} download>
          <Download aria-hidden className="h-3 w-3" />
          {HANDOFF_COPY.resourcesFile}
        </a>
        <a href={`${base}?file=agents`} className={cls} download>
          <Download aria-hidden className="h-3 w-3" />
          {HANDOFF_COPY.agentsFile}
        </a>
        <Link href={`/launch?project=${projectId}`} className={cls}>
          <Rocket aria-hidden className="h-3 w-3" />
          {HANDOFF_COPY.launch}
        </Link>
        <span className="text-[11px] text-ink-600">{HANDOFF_COPY.gateNote}</span>
      </div>
      <div className="mt-4">
        <CopyLine
          label={MCP_CONNECT.steps.loadKit}
          text={MCP_CONNECT.kitPrompt(projectId, name)}
          mono={false}
        />
      </div>
    </section>
  );
}
