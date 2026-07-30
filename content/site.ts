/**
 * Site-wide constants. Edit here to change branding, metadata, and the
 * copy that appears in more than one place.
 */
export const SITE = {
  name: "CanHav Research",
  tagline: "Arbitrum ecosystem intelligence for capital markets.",
  url: "https://canhav.dev",
  description:
    "CanHav Research is a financial intelligence terminal for the Arbitrum ecosystem: taxonomy, datasets, and on-chain metrics for stablecoins and beyond.",
  footerBlurb:
    "Arbitrum ecosystem intelligence. Research-grade datasets, curated from the Arbitrum Portal and refreshed daily.",
  footerDataLine: "Data: Arbitrum Portal · Alchemy · Dune (free tier).",
  footerLegal: "Research preview, not financial advice.",
} as const;

/** Summary stats shown under the hero. Static placeholders — edit freely. */
export const STATS = [
  { label: "Networks tracked", value: "40+", hint: "In the live store" },
  { label: "Sectors live", value: "6 / 6", hint: "Credit → Governance & Underwriting" },
  { label: "Aggregate network TVL", value: "$2.4B", hint: "Across tracked networks" },
  { label: "Sub-sectors covered", value: "24", hint: "Filterable taxonomy tags" },
] as const;
