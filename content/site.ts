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

/** Primary nav links, rendered right-aligned before the log in and sign up buttons. */
export const NAV_LINKS: ReadonlyArray<{ label: string; href: string; soon?: boolean }> = [
  { label: "Launch", href: "/launch" },
  { label: "Tokens", href: "/tokens" },
  { label: "Explore", href: "/explore" },
  { label: "Docs", href: SITE.docsUrl },
];

/**
 * The dismissible strip above the nav. Bump `id` for a new announcement so
 * visitors who closed the last one see it again; set it to null to hide the
 * strip everywhere.
 */
export const ANNOUNCEMENT: {
  id: string;
  text: string;
  linkLabel: string;
  href: string;
} | null = {
  id: "litepaper-v0.1",
  text: "The CanHav Litepaper v0.1 is out.",
  linkLabel: "Click here",
  href: `${SITE.docsUrl}/getting-started/litepaper`,
};
