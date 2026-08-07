import { ClerkProvider } from "@clerk/nextjs";

import { isAuthConfigured } from "@/lib/auth";

/**
 * Site-wide ClerkProvider so the nav can reflect signed-in state everywhere
 * (client-side session detection; no middleware needed outside the studio).
 * The provider throws without a publishable key, so an unconfigured deploy
 * renders bare children and auth-aware UI falls back to its signed-out look.
 */
export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  if (!isAuthConfigured()) return <>{children}</>;
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#0B0E14",
          colorInput: "#0B0E14",
          colorForeground: "#E6E8EC",
          colorMutedForeground: "#9BA1AE",
          colorPrimary: "#3D7BFF",
          colorInputForeground: "#E6E8EC",
          borderRadius: "0.75rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
