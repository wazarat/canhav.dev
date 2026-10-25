"use client";

import { useMemo } from "react";
import Link from "next/link";

import { deployerState } from "@/components/build/deployer-state";
import { type LaunchFacts, launchRows } from "@/components/build/launch-rows";
import type { DeployerFunding } from "@/components/build/useDeployerBalances";
import { ProgressBar } from "@/components/ui/MetaLine";
import { Property, PropertyList } from "@/components/ui/Property";
import { BUILD_COPY, type BuildTab } from "@/content/build";
import { STAGE_OPTIONS, optionLabel } from "@/content/ideation";
import { sectionsFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, shapeLabels } from "@/content/kits/copy";
import { MILESTONES, type Milestone, groupsByMilestone } from "@/lib/build-milestones";
import type { ProblemTab, ProjectProblems } from "@/lib/build-readiness";
import { chainInfo, projectChainOf } from "@/lib/chains";
import type { DeployerView } from "@/lib/deployer";
import type { ProjectDoc } from "@/lib/ideation";
import { groupProgress, kitShapes } from "@/lib/kits";

const HEADING = "text-[10px] font-semibold uppercase tracking-wide text-ink-500";
const LINK = "text-left text-ink-200 hover:underline";
const LABEL = "w-20";

/**
 * The rail beside the tabs on wide screens (M173), the way Linear lays a
 * project out: the record's properties, the four milestones with their
 * progress, and what still blocks publishing. Plain text throughout
 * (M137); every row that leads somewhere is a text link.
 */
export function ProjectRail({
  doc,
  facts,
  problems,
  tabProblems,
  agentLine,
  publicHref,
  publishedPrivate,
  deployer,
  funding,
  onTab,
  onMilestone,
}: {
  doc: ProjectDoc;
  facts: LaunchFacts;
  problems: ProjectProblems;
  tabProblems: Record<ProblemTab, string | null>;
  /** One of BUILD_COPY.agent. */
  agentLine: string;
  publicHref: string | null;
  publishedPrivate: boolean;
  deployer: DeployerView | null;
  funding: DeployerFunding;
  onTab: (tab: BuildTab) => void;
  /** Opens the Build tab on one milestone. */
  onMilestone: (m: Milestone) => void;
}) {
  const R = BUILD_COPY.rail;
  const kit = doc.kit;
  const by = useMemo(() => groupsByMilestone(sectionsFor(kitShapes(kit), kit ?? {})), [kit]);
  const shapes = shapeLabels(kit);
  const launch = launchRows(facts);
  const progress = (m: Milestone) =>
    m === "launch" ? { done: launch.filter((r) => r.done).length, total: launch.length } : groupProgress(by[m], kit);
  const open = (Object.keys(tabProblems) as ProblemTab[]).filter((t) => tabProblems[t]);
  const status = facts.published ? (publishedPrivate ? R.publishedPrivate : R.published) : R.draft;

  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-3">
        <h2 className={HEADING}>{R.properties}</h2>
        <PropertyList>
          <Property labelClassName={LABEL} label={R.status} value={status} />
          <Property labelClassName={LABEL} label={R.stage} value={doc.stage ? optionLabel(STAGE_OPTIONS, doc.stage) : R.none} />
          <Property labelClassName={LABEL} label={R.chain} value={chainInfo(projectChainOf(doc)).short} />
          <Property labelClassName={LABEL} label={R.shapes} value={shapes.length ? shapes.join(", ") : R.none} />
          <Property labelClassName={LABEL} label={R.agent} value={agentLine} />
          <Property
            labelClassName={LABEL}
            label={R.deployer}
            value={
              <button type="button" onClick={() => onTab("deployments")} className={LINK}>
                {deployerState(deployer, funding).label}
              </button>
            }
          />
          {publicHref ? (
            <Property
              labelClassName={LABEL}
              label={R.page}
              value={
                <Link href={publicHref} className={LINK}>
                  {R.openPage}
                </Link>
              }
            />
          ) : null}
        </PropertyList>
      </section>

      <section className="space-y-3 border-t border-ink-700/40 pt-5">
        <h2 className={HEADING}>{R.milestones}</h2>
        {kit?.shape ? (
          <ul className="space-y-1">
            {MILESTONES.map((m) => {
              const p = progress(m);
              return (
                <li key={m}>
                  <button
                    type="button"
                    onClick={() => onMilestone(m)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-ink-800/60"
                  >
                    <span className="flex-1 truncate text-ink-200">{BUILD_COPY.milestones[m].label}</span>
                    <ProgressBar done={p.done} total={p.total} className="w-10" />
                    <span className="shrink-0 whitespace-nowrap text-right text-xs text-ink-400">{CHECKLIST_COPY.progress(p.done, p.total)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <button type="button" onClick={() => onTab("decisions")} className="text-left text-xs leading-relaxed text-ink-400 hover:underline">
            {R.noShape}
          </button>
        )}
      </section>

      <section className="space-y-2 border-t border-ink-700/40 pt-5">
        <h2 className={HEADING}>{R.readiness}</h2>
        {problems.overall === null ? (
          <p className="text-xs text-ink-400">{R.ready}</p>
        ) : open.length ? (
          <ul className="space-y-1.5">
            {open.map((t) => (
              <li key={t}>
                <button type="button" onClick={() => onTab(t)} className="text-left text-xs leading-relaxed text-ink-300 hover:underline">
                  {tabProblems[t]}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed text-ink-400">{problems.overall}</p>
        )}
      </section>
    </div>
  );
}
