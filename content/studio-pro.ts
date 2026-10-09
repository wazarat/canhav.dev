/**
 * Copy for the Studio Pro page (/studiopro), the services offer for small
 * teams. Reached from the studio's "Join Studio Pro" button, not from the nav.
 * No colons and no em dashes in any string (npm run check:copy).
 */
export const STUDIO_PRO_COPY = {
  metaTitle: "Studio Pro",
  metaDescription:
    "Studio Pro from CanHav Research. Legalities, market validation, development, reachouts, customer discovery and content, handled and managed for small teams.",
  reachOut: "Reach out",
  kicker: "Studio Pro",
  title: "Your team is small. Your to do list is not.",
  lead:
    "Legalities, market validation, development, reachouts, customer discovery, content and more. We help small teams do all of it and manage all of it, so you can stay on the product.",
  /** The workstreams a small team carries on top of the product. */
  plate: [
    "Legal and compliance",
    "Market validation",
    "Development",
    "Reachouts",
    "Customer discovery",
    "Content",
    "Fundraising prep",
    "Launch operations",
  ],
  plateNote: "Pick what you want off your plate. We take it from there.",
  plateCta: "Talk to us",
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
} as const;
