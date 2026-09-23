/**
 * Site-wide constants. Edit here to change branding, metadata, and the
 * copy that appears in more than one place.
 */
export const SITE = {
  name: "CanHav Research",
  tagline: "DeFi ecosystem solutions for capital markets.",
  url: "https://canhav.com",
  docsUrl: "https://docs.canhav.com",
  description:
    "CanHav Research builds DeFi ecosystem solutions. Token design, testnet deployment, MCP data connectors, and market validation for teams and independent builders.",
  footerBlurb:
    "DeFi ecosystem solutions. Research grade datasets and launch tooling, curated and refreshed daily.",
  footerLegal: "Research preview, not financial advice.",
} as const;

/** Primary nav links, rendered right-aligned before the Join waitlist button. */
export const NAV_LINKS: ReadonlyArray<{ label: string; href: string; soon?: boolean }> = [
  { label: "Launch", href: "/launch" },
  { label: "Tokens", href: "/tokens" },
  { label: "Projects", href: "/projects" },
  { label: "Docs", href: SITE.docsUrl },
];
