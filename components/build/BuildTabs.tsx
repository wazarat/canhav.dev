"use client";

import { Segmented } from "@/components/ui/Segmented";
import { BUILD_COPY, BUILD_TABS, type BuildTab } from "@/content/build";
import type { ProblemTab } from "@/lib/build-readiness";
import { cn } from "@/lib/utils";

/**
 * The five fixed tabs of the project page (M94). One tablist that never
 * grows with the product shapes; a dot on Decisions and Publish marks open
 * publish gated fields. Five options is one over the usual two to four for
 * Segmented, which is fine for the one tablist on the page.
 */
export function BuildTabs({
  tab,
  onChange,
  problems,
}: {
  tab: BuildTab;
  onChange: (tab: BuildTab) => void;
  /** The first open problem per gated tab, null when complete. */
  problems: Record<ProblemTab, string | null>;
}) {
  const options = BUILD_TABS.map((value) => {
    const problem = value === "decisions" || value === "publish" ? problems[value] : null;
    return {
      value,
      title: problem ? BUILD_COPY.tabProblems[value as ProblemTab] : undefined,
      label: (
        <span className="inline-flex items-center gap-1.5">
          {BUILD_COPY.tabs[value]}
          {problem ? <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full bg-ink-500")} /> : null}
        </span>
      ),
    };
  });
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <Segmented role="tablist" ariaLabel={BUILD_COPY.kicker} value={tab} onChange={onChange} options={options} />
    </div>
  );
}
