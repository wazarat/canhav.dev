/**
 * The new project pop up (M91 follow up, 2026-10-18). It is mounted once in
 * the studio layout and opens on a window event, so the track card, the
 * command menu and the nav switcher all open it in place rather than
 * leaving the page. Client only, no React, like lib/command-menu.ts.
 */
export const OPEN_NEW_PROJECT_EVENT = "canhav:new-project";

/** The query flag a deep link (/studio/new, the sign in round trip) uses to open the pop up on the studio home. */
export const NEW_PROJECT_PARAM = "new";

export function openNewProject(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_NEW_PROJECT_EVENT));
}
