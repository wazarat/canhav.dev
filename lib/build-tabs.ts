import { BUILD_TABS, type BuildTab } from "@/content/build";

/**
 * The tabs a session sees on the project page (M136). Business model and
 * Brand hold Studio+ work only, so a free account does not see them at
 * all; a Studio+ account sees them whatever the project's own plan, since
 * the gate inside says what to do (move the project, renew the plan).
 */
export const PLUS_TABS: readonly BuildTab[] = ["model", "brand"];

export function buildTabsFor(plusSession: boolean): readonly BuildTab[] {
  return plusSession ? BUILD_TABS : BUILD_TABS.filter((t) => !PLUS_TABS.includes(t));
}
