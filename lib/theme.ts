"use client";

import { useSyncExternalStore } from "react";

import {
  CLERK_SESSION_COOKIE,
  THEME_COLOR,
  THEME_STORAGE_KEY,
  defaultThemeFor,
  type Theme,
} from "@/lib/theme-constants";

export { THEME_COLOR, THEME_STORAGE_KEY, type Theme };

/**
 * Theme runtime (M73, M146). The server renders dark on every route so the
 * marketing pages stay static (no cookie read in the root layout); the
 * inline ThemeScript applies the right theme before first paint, and this
 * store keeps React in step with the html class afterwards. The default is
 * light for a signed in person and dark for a visitor; a choice made with
 * the nav toggle is stored and wins. There is no OS fallback.
 */

const listeners = new Set<() => void>();

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/** The theme on the document, dark when nothing has been applied yet. */
export function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

/** The stored preference, or null when the visitor never chose. */
export function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** Whether Clerk's session cookie says a session exists (the ThemeScript rule). */
export function signedInFromCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((part) => {
    const c = part.trim();
    if (!c.startsWith(CLERK_SESSION_COOKIE)) return false;
    const v = c.slice(c.indexOf("=") + 1);
    return v !== "" && v !== "0" && !Number.isNaN(Number(v));
  });
}

function setMetaThemeColor(theme: Theme) {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  if (metas.length === 0) return;
  // The viewport renders one meta per colour scheme; after a manual switch
  // both carry the chosen colour so every browser shows the same chrome.
  metas.forEach((meta) => {
    meta.setAttribute("content", THEME_COLOR[theme]);
  });
}

/** Switch the document, remember the choice and notify subscribers. */
export function applyTheme(theme: Theme, { remember = true }: { remember?: boolean } = {}) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  setMetaThemeColor(theme);
  if (remember) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Private mode or blocked storage; the choice lasts for this page.
    }
  }
  listeners.forEach((fn) => fn());
}

/**
 * Apply the default for this sign in state when nothing is stored, so a
 * sign in or sign out without a full reload still lands on the right theme.
 */
export function syncThemeToAuth(signedIn: boolean) {
  if (storedTheme() !== null) return;
  const next = defaultThemeFor(signedIn);
  if (readTheme() !== next) applyTheme(next, { remember: false });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** The current theme; "dark" on the server and during hydration. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "dark");
}
