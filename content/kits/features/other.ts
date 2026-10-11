import type { FeatureLists } from "@/lib/kits";

/** Features of the two Other shapes (M68). No colons, no em dashes. */
export const OTHER_FEATURES: FeatureLists = {
  cover_pool: [
    {
      id: "cover_pool.f.bonded-assertion",
      title: "Claims settled by a bonded assertion",
      detail: "A claimant asserts the event with a bond and anyone may dispute it in a window. Adds the assertion step.",
      templates: ["uma-optimistic-oracle-v3"],
    },
    {
      id: "cover_pool.f.court",
      title: "Disputes go to a court",
      detail: "A disputed claim is decided by jurors rather than the pool's own vote. Adds the dispute step.",
      templates: ["kleros-v2"],
    },
    {
      id: "cover_pool.f.parametric",
      title: "Parametric trigger",
      detail: "A data feed proves the event and a formula sets the payout, so no one assesses a loss. Adds the trigger step.",
      templates: ["etherisc-gif-v3"],
    },
    {
      id: "cover_pool.f.backs-a-product",
      title: "First loss for another product",
      detail: "The pool stands as first loss capital for a lending or trading product and earns a share of its fees. Adds the first loss step.",
      templates: ["ensuro", "sherlock-v2"],
    },
    {
      id: "cover_pool.f.marketplace",
      title: "Sold through an existing cover marketplace",
      detail: "Policies are listed on a live cover protocol, so its claim rules and capital apply and yours is the product on top.",
      templates: ["nexus-mutual", "neptune-mutual"],
    },
  ],
  governance_stack: [
    {
      id: "governance_stack.f.creator-fees",
      title: "Receives creator fees from a launched token",
      detail: "The timelock or the DAO is the fee recipient and holders direct the flow. Adds the fee recipient step.",
      templates: ["openzeppelin-governor-suite", "aragon-osx", "compound-governor"],
    },
    {
      id: "governance_stack.f.offchain-votes",
      title: "Votes off-chain, executes on-chain",
      detail: "Holders vote with plain balances off-chain and a module executes the result after a dispute window. Adds the off-chain step.",
      templates: ["snapshot-x", "zodiac-reality-module"],
    },
    {
      id: "governance_stack.f.scoped-roles",
      title: "Operators with scoped rights",
      detail: "A team or a bot may spend within limits the vote set, such as buybacks only. Adds the scoped roles step.",
      templates: ["zodiac-roles-modifier", "hats-protocol"],
    },
    {
      id: "governance_stack.f.wrapped-token",
      title: "Wraps an existing token for votes",
      detail: "The token has no checkpoints, so a wrapper adds them and holders wrap to vote. Adds the wrapper step.",
      templates: ["openzeppelin-governor-suite"],
    },
    {
      id: "governance_stack.f.dao-framework",
      title: "Built on a DAO framework",
      detail: "The DAO, its plugins and its permissions come from a framework's factory rather than your own governor deployment.",
      templates: ["aragon-osx"],
    },
  ],
};
