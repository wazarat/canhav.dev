"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { AGENT_COPY } from "@/content/ideation";
import { BUILD_TABS, type BuildTab } from "@/content/build";
import { MILESTONES, type Milestone } from "@/lib/build-milestones";

export { BUILD_TABS, type BuildTab };

export function isBuildTab(value: string | null | undefined): value is BuildTab {
  return (BUILD_TABS as readonly string[]).includes(value ?? "");
}

const AGENT_HASH = `#${AGENT_COPY.anchor}`;

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const atAgentHash = () => window.location.hash === AGENT_HASH;
const neverOnServer = () => false;

/**
 * The BUILD page's tab (M93), read from `?tab=`. Overview is the default
 * and what an unknown value falls back to. A `#agent-changes` hash (the
 * studio list, the guide modal and the agent's review link) lands on
 * Overview, where the feed lives. Setting a tab replaces the URL in place
 * without scrolling, the way the template filters do, so the tab survives
 * a reload and the browser's back button moves between tabs.
 */
const MILESTONE_PARAM = "milestone";

function isMilestone(value: string | null): value is Milestone {
  return (MILESTONES as readonly string[]).includes(value ?? "");
}

export function useTabParam(): {
  tab: BuildTab;
  setTab: (tab: BuildTab) => void;
  /** The Build milestone in view, from ?milestone= (the sidebar's sub items), empty for all. */
  milestone: Milestone | "";
  setMilestone: (m: Milestone | "") => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const agentHash = useSyncExternalStore(subscribeHash, atAgentHash, neverOnServer);

  const raw = params.get("tab");
  const tab: BuildTab = agentHash ? "overview" : isBuildTab(raw) ? raw : "overview";
  const rawMilestone = params.get(MILESTONE_PARAM);
  const milestone: Milestone | "" = tab === "build" && isMilestone(rawMilestone) ? rawMilestone : "";

  const replace = useCallback(
    (qs: URLSearchParams) => {
      const s = qs.toString();
      // The new URL carries no hash, so a deep link's hash stops pinning Overview.
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const setTab = useCallback(
    (next: BuildTab) => {
      const qs = new URLSearchParams(params.toString());
      if (next === "overview") qs.delete("tab");
      else qs.set("tab", next);
      if (next !== "build") qs.delete(MILESTONE_PARAM);
      replace(qs);
    },
    [params, replace],
  );

  const setMilestone = useCallback(
    (m: Milestone | "") => {
      const qs = new URLSearchParams(params.toString());
      qs.set("tab", "build");
      if (m) qs.set(MILESTONE_PARAM, m);
      else qs.delete(MILESTONE_PARAM);
      replace(qs);
    },
    [params, replace],
  );

  return { tab, setTab, milestone, setMilestone };
}
