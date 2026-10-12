import type { ShapeOption } from "@/content/kits/copy";

/** The three staking shapes (M66), one per subsector. No em dashes, no colons in UI strings. */
export const STAKING_SHAPE_OPTIONS: ReadonlyArray<ShapeOption> = [
  {
    value: "liquid_staking_token",
    building: "a liquid staking token",
    label: "Liquid staking token",
    blurb:
      "Holders stake an asset with you and receive a liquid token that keeps earning " +
      "while they use it elsewhere. You decide what is staked, who runs the validators " +
      "or the reward module, and how the token tracks the position.",
    examples: [
      "A staked version of your launched token that streams fees to stakers and stays tradable",
      "A wrapper around an existing ETH staking token so your app shows one balance that grows",
      "A validator pool for a partner chain with a non rebasing receipt token",
    ],
  },
  {
    value: "restaking_service",
    building: "a restaking service",
    label: "Restaking service",
    blurb:
      "Already staked assets secure a second service you run. You define the service, " +
      "the operators who serve it, what they are slashed for, and how rewards reach " +
      "stakers and operators.",
    examples: [
      "An oracle or keeper network whose operators post restaked ETH as a bond",
      "A verification service for a rollup that borrows security from an existing restaking core",
      "A reward splitter that pays stakers and operators from the fees your service earns",
    ],
  },
  {
    value: "liquid_restaking_token",
    building: "a liquid restaking token",
    label: "Liquid restaking token",
    blurb:
      "Users deposit an asset or a staking token and get back one liquid token backed " +
      "by positions you restake across services. You pick the services, the operators " +
      "and the exit queue, and you show the slashing risk of each.",
    examples: [
      "A token backed by restaked ETH across two services with the share of each published",
      "A restaking vault for one partner service that issues its own receipt token",
      "A bridged version of an existing restaking token with the deposit contract on your chain",
    ],
  },
];
