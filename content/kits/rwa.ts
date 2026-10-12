import type { ShapeOption } from "@/content/kits/copy";

/** The three RWA shapes (M67), one per subsector. No em dashes, no colons in UI strings. */
export const RWA_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "tokenized_security",
    building: "stock and fund tokens",
    label: "Stock and fund tokens",
    blurb:
      "You issue or build on tokens that track a stock, a fund or a bond. You decide " +
      "who may hold them, how splits and dividends reach the token, which feed values " +
      "them and what the issuer may freeze or force.",
    examples: [
      "A savings product that holds stock tokens for users and shows one balance in dollars",
      "A permissioned fund share token with an on-chain allowlist and an issuer who can recall it",
      "Collateral built on an exchange's stock tokens with a feed that respects market hours",
    ],
  },
  {
    value: "private_credit_pool",
    building: "a private credit pool",
    label: "Private credit pool",
    blurb:
      "Lenders pool capital and you or a delegate underwrite loans to named borrowers " +
      "off-chain. You set the tranches, the first loss, the loan terms and the " +
      "reporting the pool publishes.",
    examples: [
      "A senior and junior pool funding invoices for a payments business, with monthly reporting",
      "A credit line to one borrower where lenders see the terms and the reserve ratio",
      "A fund of pools token that allocates across underwriters you have approved",
    ],
  },
  {
    value: "asset_backed_token",
    building: "a reserve-backed token",
    label: "Reserve-backed token",
    blurb:
      "You issue a token backed one to one by a reserve held off-chain or on another " +
      "chain. You decide who attests the reserve, who may mint and burn, the transfer " +
      "rules and how the token moves between chains.",
    examples: [
      "A gold or treasury-backed token with minting gated on a proof of reserve feed",
      "A stablecoin for one region with an allowlist, a freeze role and published attestations",
      "A bridged RWA token that moves between two chains under rate limits",
    ],
  },
];
