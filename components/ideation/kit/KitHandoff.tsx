"use client";

import Link from "next/link";
import { Download, Rocket } from "lucide-react";

import { CopyLine } from "@/components/ui/CopyLine";
import { HANDOFF_COPY } from "@/content/kits/copy";
import { MCP_CONNECT } from "@/content/launch";

/**
 * "Get this into your IDE" on the Review step. Two downloads from the draft
 * export route (sign-in gated, the route bounces and returns) and the MCP
 * prompt that makes an agent load the pack. Static apart from the project id
 * and name.
 */
export function KitHandoff({ projectId, name }: { projectId: string; name: string }) {
  const base = `/api/export/project/${projectId}`;
  const cls =
    "inline-flex items-center gap-1.5 rounded-full border border-ink-700/70 px-3 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-electric-500/50 hover:text-electric-200";
  return (
    <section className="glass mt-6 rounded-2xl p-5" aria-label={HANDOFF_COPY.title}>
      <h3 className="font-display text-sm font-semibold text-ink-50">{HANDOFF_COPY.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{HANDOFF_COPY.intro}</p>
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
      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">{HANDOFF_COPY.footnote}</p>
    </section>
  );
}
