"use client";

import { useSyncExternalStore } from "react";

import { THEME_COLOR, THEME_STORAGE_KEY, type Theme } from "@/lib/theme-constants";

export { THEME_COLOR, THEME_STORAGE_KEY, type Theme };

/**
 * Theme runtime (M73). Dark is the default and what the server renders;
 * the inline ThemeScript applies the stored choice before first paint, and
 * this store keeps React in step with the html class afterwards. The
 * choice lives in localStorage so marketing routes stay static (no cookie
 * read in the root layout).
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

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Follow the OS only while the visitor has not chosen.
  const media = window.matchMedia("(prefers-color-scheme: light)"); // copy-ok, a media query
  const onMedia = (e: MediaQueryListEvent) => {
    if (storedTheme() === null) applyTheme(e.matches ? "light" : "dark", { remember: false });
  };
  media.addEventListener("change", onMedia);
  return () => {
    listeners.delete(fn);
    media.removeEventListener("change", onMedia);
  };
}

/** The current theme; "dark" on the server and during hydration. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "dark");
}
