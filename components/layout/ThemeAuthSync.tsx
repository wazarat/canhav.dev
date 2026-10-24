"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

import { syncThemeToAuth } from "@/lib/theme";

/**
 * Keeps the default theme in step with sign in state (M146). The inline
 * ThemeScript decides before first paint from Clerk's cookie; this effect
 * covers a sign in or sign out that happens without a full reload. A
 * stored choice is never touched. Rendered inside ClerkProvider only.
 */
export function ThemeAuthSync() {
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    syncThemeToAuth(Boolean(isSignedIn));
  }, [isLoaded, isSignedIn]);
  return null;
}
