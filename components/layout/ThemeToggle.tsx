"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { applyTheme, useTheme } from "@/lib/theme";

const LABEL = {
  toLight: "Switch to light mode",
  toDark: "Switch to dark mode",
} as const;

/**
 * The nav's theme switch (M73). Before hydration useTheme reads "dark",
 * which matches the server markup, so the first client render never
 * mismatches; the inline ThemeScript has already set the real class.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? LABEL.toLight : LABEL.toDark;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      onClick={() => applyTheme(next)}
      className="h-9 w-9 px-0"
    >
      {theme === "dark" ? (
        <Sun aria-hidden className="h-4 w-4" />
      ) : (
        <Moon aria-hidden className="h-4 w-4" />
      )}
    </Button>
  );
}
