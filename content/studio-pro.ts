/**
 * Copy for the Studio Pro page (/studiopro), the services offer for small
 * teams. Reached from the studio's "Join Studio Pro" button, not from the nav.
 * No colons and no em dashes in any string (npm run check:copy).
 */
export const STUDIO_PRO_COPY = {
  metaTitle: "Studio Pro",
  metaDescription:
    "Studio Pro from CanHav Research. Legal and compliance, product development, customer discovery, content, fundraising prep and launch operations, handled and managed for small Web3 teams.",
  kicker: "Are you developing a DeFi product?",
  /** Two fixed lines. The second one carries the hero gradient. */
  titleLine1: "Your team may be small.",
  titleLine2: "Your to do list is not.",
  /**
   * CoinGecko counted 53% of every token listed on GeckoTerminal as dead by
   * late 2025 (52.7% in its April 2025 report). The sentence stays "over half"
   * so it holds as the number moves.
   */
  leadFact: "Over half of all tokens ever listed are already dead.",
  lead:
    "Small teams find it increasingly complicated to juggle everything needed to bring a Web3 project to market.",
  cta: "Let's talk",
  ctaNote: "Pick what you want off your plate. We take it from there.",
  cards: {
    testnet: {
      title: "Testnet Design",
      description:
        "Design your token in the studio and deploy it to testnet in minutes. Supply, allocations, and vesting captured as a verifiable record.",
      cta: "Open the studio",
    },
    workflow: {
      title: "Manage Workflow",
      description:
        "Run your launch work from the tools your team already uses. Query published designs, deployed launches, verified journeys, sales and pools over MCP and keep every workstream moving from one place.",
      cta: "Read the docs",
    },
    validation: {
      title: "Market Validation",
      description:
        "Publish the evidence behind your launch and gather real market feedback before a market exists. Scrutiny first, speculation later.",
      cta: "Start validating",
    },
  },
  /** The six services, each card opens the contact form. */
  serviceCta: "Ask about this",
  services: {
    legal: {
      title: "Legal and Compliance",
      description:
        "Entity setup, token classification, terms and disclosures, and the KYC or AML path that fits your market. Reviewed before anything goes live.",
    },
    development: {
      title: "Product Development",
      description:
        "Contracts, indexers and front ends built to the design you published, with audits scoped early and shipped on a schedule you can see.",
    },
    discovery: {
      title: "Customer Discovery",
      description:
        "Interviews, surveys and usage signals that tell you who actually wants the product, before the token decides it for you.",
    },
    content: {
      title: "Content and Media",
      description:
        "Docs, launch posts, explainers and the social cadence that keeps your community informed, written from the evidence you publish.",
    },
    fundraising: {
      title: "Fundraising Prep",
      description:
        "Data room, deck, tokenomics narrative and investor reachouts, grounded in the on-chain record so every claim checks out.",
    },
    operations: {
      title: "Launch Operations",
      description:
        "Timeline, listings, liquidity, milestone updates and the day of launch itself, run as one plan with someone accountable for each step.",
    },
  },
} as const;
