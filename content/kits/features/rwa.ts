import type { FeatureLists } from "@/lib/kits";

/** Features of the three RWA shapes (M67). No colons, no em dashes. */
export const RWA_FEATURES: FeatureLists = {
  tokenized_security: [
    {
      id: "tokenized_security.f.pons-pairing",
      title: "Pons pairing",
      detail: "The stock token is paired with a token launched on Pons through a peg pool. Adds the pairing step.",
      templates: ["peg-contracts", "robinhood-stock-tokens"],
    },
    {
      id: "tokenized_security.f.own-issuance",
      title: "You are the issuer",
      detail: "You issue the security token yourself, so the standard, the identity registry and the issuer powers are yours.",
      templates: ["erc3643-t-rex", "erc1400-universal-token", "securitize-dstoken"],
    },
    {
      id: "tokenized_security.f.exchange-tokens",
      title: "Built on an exchange's stock tokens",
      detail: "The tokens are an exchange's, so your product follows their eligibility, hours and corporate action rules.",
      templates: ["robinhood-stock-tokens", "dinari-dshares", "backed-token"],
    },
    {
      id: "tokenized_security.f.fund-shares",
      title: "Fund or treasury shares",
      detail: "The token tracks a fund rather than one stock, so pricing follows a NAV and subscriptions follow the fund's cadence.",
      templates: ["ondo-rwa-contracts", "superstate-ustb"],
    },
  ],
  private_credit_pool: [
    {
      id: "private_credit_pool.f.fixed-rate",
      title: "Fixed rate for lenders",
      detail: "The pool's yield is split so lenders can lock a rate to a maturity. Adds the tokenisation step.",
      templates: ["pendle-v2"],
    },
    {
      id: "private_credit_pool.f.delegate-underwriter",
      title: "Delegate underwriters",
      detail: "Named delegates underwrite loans inside limits the pool sets, so delegate admission is a list with a review.",
      templates: ["maple-v2", "wildcat-v2"],
    },
    {
      id: "private_credit_pool.f.open-lenders",
      title: "Open to any lender",
      detail: "Anyone may deposit, so the disclosures and the queue do the work an allowlist would.",
      templates: ["huma-v2", "goldfinch"],
    },
    {
      id: "private_credit_pool.f.tokenised-assets",
      title: "Loans as tokenised assets",
      detail: "Each loan is a token the pool holds, so valuation and transfer of a loan are contract paths.",
      templates: ["centrifuge-protocol-v3"],
    },
  ],
  asset_backed_token: [
    {
      id: "asset_backed_token.f.multichain",
      title: "Lives on more than one chain",
      detail: "The token moves between chains through a pool or a bridge. Adds the rate limit step.",
      templates: ["chainlink-ccip", "midas-mtokens"],
    },
    {
      id: "asset_backed_token.f.proof-of-reserve",
      title: "On-chain proof of reserve",
      detail: "A feed reports the reserve and minting reads it, so a stale feed stops the mint.",
      templates: ["chainlink-proof-of-reserve"],
    },
    {
      id: "asset_backed_token.f.permissioned-holders",
      title: "Permissioned holders",
      detail: "Only identified wallets may hold, so the allowlist and its maintainer are part of the token.",
      templates: ["erc3643-t-rex", "chainlink-ace", "oz-community-erc7943"],
    },
    {
      id: "asset_backed_token.f.yield-bearing",
      title: "Yield bearing",
      detail: "The reserve earns and the token passes it on, so the rate source and the accrual are disclosed.",
      templates: ["midas-mtokens", "paxos-token-contracts"],
    },
  ],
};
