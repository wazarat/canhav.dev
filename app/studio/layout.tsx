import { ClerkProvider } from "@clerk/nextjs";

import { isAuthConfigured } from "@/lib/auth";

/**
 * ClerkProvider scoped to the studio — the rest of the site (marketing,
 * /launch, /p, /t) never loads Clerk client code. The provider throws
 * without a publishable key, so an unconfigured deploy renders bare
 * children and the page shows its config chip instead.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
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
