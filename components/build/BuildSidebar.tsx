"use client";

import Link from "next/link";
import { BookOpen, Bot, ChevronDown, ExternalLink, FileCode2, Globe, Hammer, History, LayoutDashboard, Map, Scale, Server } from "lucide-react";

import { RESOURCE_VIEWS, type ResourceView } from "@/components/build/ResourcesDrawer";

import { AGENT_COPY } from "@/content/ideation";
import { BUILD_COPY, BUILD_TABS, type BuildTab } from "@/content/build";
import { MILESTONES, type Milestone } from "@/lib/build-milestones";
import type { ProblemTab } from "@/lib/build-readiness";
import { cn } from "@/lib/utils";

const ICONS: Record<BuildTab, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  build: Hammer,
  decisions: Scale,
  deployments: Server,
  publish: Globe,
};

const RESOURCE_ICONS: Record<ResourceView, React.ComponentType<{ className?: string }>> = {
  pack: BookOpen,
  templates: FileCode2,
  environment: Map,
};

/** The Decisions sections the sidebar scrolls to (M113). */
const DECISION_SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "building", label: BUILD_COPY.decisions.building },
  { id: "customers", label: BUILD_COPY.decisions.customers },
  { id: "canvas", label: BUILD_COPY.decisions.canvas },
  { id: "chain", label: BUILD_COPY.decisions.chain },
  { id: "templates", label: BUILD_COPY.decisions.templates },
  { id: "contracts", label: BUILD_COPY.decisions.contracts },
  { id: "security", label: BUILD_COPY.decisions.security },
  { id: "files", label: BUILD_COPY.decisions.files },
];

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors";
const IDLE = "text-ink-300 hover:bg-ink-800/60 hover:text-ink-50";
const ACTIVE = "bg-ink-800/60 text-ink-50";

/**
 * The project page's left rail on wide screens (2026-10-18), after the
 * dashboards builders already use: the five sections, Build opening into
 * its four milestones, then the agent and the public page. On phones the
 * tab strip takes its place.
 */
export function BuildSidebar({
  name,
  logo,
  tab,
  milestone,
  problems,
  publicHref,
  onTab,
  onMilestone,
  onResource,
  onHistory,
}: {
  name: string;
  logo: string | null;
  tab: BuildTab;
  milestone: Milestone | "";
  problems: Record<ProblemTab, string | null>;
  /** The public page once published, else null. */
  publicHref: string | null;
  onTab: (tab: BuildTab) => void;
  onMilestone: (m: Milestone | "") => void;
  /** Opens the resources drawer on one section. */
  onResource: (view: ResourceView) => void;
  /** Opens the version history pop up (M110). */
  onHistory: () => void;
}) {
  const R = BUILD_COPY.resources;
  return (
    <nav aria-label={BUILD_COPY.kicker} className="flex h-full flex-col gap-1 p-3">
      <div className="mb-3 flex items-center gap-2.5 px-2 pt-1">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-7 w-7 shrink-0 rounded-md border border-ink-700/60 object-cover" />
        ) : (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ink-700/60 bg-ink-900 text-[11px] font-semibold text-ink-300">
            {(name.trim() || "U").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="truncate text-sm font-medium text-ink-50">{name.trim() || "Untitled"}</span>
      </div>

      {BUILD_TABS.map((t) => {
        const Icon = ICONS[t];
        const active = tab === t;
        const dot = t === "decisions" || t === "publish" ? problems[t as ProblemTab] : null;
        const expandable = t === "build";
        return (
          <div key={t}>
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              title={dot ?? undefined}
              onClick={() => {
                onTab(t);
                if (expandable) onMilestone("");
              }}
              className={cn(ITEM, active ? ACTIVE : IDLE)}
            >
              <Icon className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
              <span className="flex-1 truncate">{BUILD_COPY.tabs[t]}</span>
              {dot ? <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink-500" /> : null}
              {expandable ? (
                <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 text-ink-500 transition-transform", active && "rotate-180")} />
              ) : null}
            </button>
            {t === "decisions" && active ? (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-ink-700/40 pl-2">
                {DECISION_SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => document.getElementById(`decisions-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className={cn(ITEM, "py-1.5 text-[13px]", IDLE)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : null}
            {expandable && active ? (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-ink-700/40 pl-2">
                {MILESTONES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-current={milestone === m ? "page" : undefined}
                    onClick={() => onMilestone(milestone === m ? "" : m)}
                    className={cn(ITEM, "py-1.5 text-[13px]", milestone === m ? ACTIVE : IDLE)}
                  >
                    {BUILD_COPY.milestones[m].label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="my-2 border-t border-ink-700/40" />

      <button
        type="button"
        onClick={() => {
          onTab("overview");
          requestAnimationFrame(() => document.getElementById(AGENT_COPY.anchor)?.scrollIntoView({ behavior: "smooth" }));
        }}
        className={cn(ITEM, IDLE)}
      >
        <Bot className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
        <span className="flex-1 truncate">{AGENT_COPY.title}</span>
      </button>
      <button type="button" onClick={onHistory} className={cn(ITEM, IDLE)}>
        <History className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
        <span className="flex-1 truncate">{BUILD_COPY.sidebar.history}</span>
      </button>
      {publicHref ? (
        <Link href={publicHref} className={cn(ITEM, IDLE)}>
          <ExternalLink className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
          <span className="flex-1 truncate">{BUILD_COPY.sidebar.publicPage}</span>
        </Link>
      ) : null}

      <div className="my-2 border-t border-ink-700/40" />
      <p className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-ink-500">{R.groupTitle}</p>
      <p className="px-3 pb-1.5 text-[11px] leading-relaxed text-ink-500">{R.groupHint}</p>
      {RESOURCE_VIEWS.map((v) => {
        const Icon = RESOURCE_ICONS[v];
        return (
          <button key={v} type="button" onClick={() => onResource(v)} className={cn(ITEM, IDLE)}>
            <Icon className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            <span className="flex-1 truncate">{R.views[v]}</span>
          </button>
        );
      })}
    </nav>
  );
}
