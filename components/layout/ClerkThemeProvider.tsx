"use client";

import { ClerkProvider } from "@clerk/nextjs";

import { useTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme-constants";

/**
 * ClerkProvider with an appearance that follows the site theme (M73).
 * Appearance is a prop, so toggling restyles mounted SignIn and SignUp
 * cards without a remount. The dark values are the ones the site shipped
 * with; light mirrors the Pons canvas used by html.light in globals.css.
 */
const CLERK_APPEARANCE: Record<Theme, { variables: Record<string, string> }> = {
  dark: {
    variables: {
      colorBackground: "#0B0E14",
      colorInput: "#0B0E14",
      colorForeground: "#E6E8EC",
      colorMutedForeground: "#9BA1AE",
      colorPrimary: "#3D7BFF",
      colorInputForeground: "#E6E8EC",
      borderRadius: "0.75rem",
    },
  },
  light: {
    variables: {
      colorBackground: "#FFFFFF",
      colorInput: "#FFFFFF",
      colorForeground: "#0C1500",
      colorMutedForeground: "#5A6052",
      colorPrimary: "#2563EB",
      colorInputForeground: "#0C1500",
      colorNeutral: "#0C1500",
      borderRadius: "0.75rem",
    },
  },
};

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ClerkProvider signInUrl="/studio" signUpUrl="/sign-up" appearance={CLERK_APPEARANCE[theme]}>
      {children}
    </ClerkProvider>
  );
}
