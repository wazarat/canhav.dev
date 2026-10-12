import { ClerkThemeProvider } from "@/components/layout/ClerkThemeProvider";
import { isAuthConfigured } from "@/lib/auth";

/**
 * Site-wide ClerkProvider so the nav can reflect signed-in state everywhere
 * (client-side session detection; no middleware needed outside the studio).
 * The provider throws without a publishable key, so an unconfigured deploy
 * renders bare children and auth-aware UI falls back to its signed-out look.
 * The server guard stays here; the themed provider is a client component.
 */
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  if (!isAuthConfigured()) return <>{children}</>;
  return <ClerkThemeProvider>{children}</ClerkThemeProvider>;
}
