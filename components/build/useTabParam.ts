"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { AGENT_COPY } from "@/content/ideation";
import { BUILD_TABS, type BuildTab } from "@/content/build";

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
export function useTabParam(): { tab: BuildTab; setTab: (tab: BuildTab) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const agentHash = useSyncExternalStore(subscribeHash, atAgentHash, neverOnServer);

  const raw = params.get("tab");
  const tab: BuildTab = agentHash ? "overview" : isBuildTab(raw) ? raw : "overview";

  const setTab = useCallback(
    (next: BuildTab) => {
      const qs = new URLSearchParams(params.toString());
      if (next === "overview") qs.delete("tab");
      else qs.set("tab", next);
      const s = qs.toString();
      // The new URL carries no hash, so a deep link's hash stops pinning Overview.
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { tab, setTab };
}
