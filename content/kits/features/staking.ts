import type { FeatureLists } from "@/lib/kits";

/** Features of the three staking shapes (M66). No colons, no em dashes. */
export const STAKING_FEATURES: FeatureLists = {
  liquid_staking_token: [
    {
      id: "liquid_staking_token.f.bridged",
      title: "Bridged from another chain",
      detail: "The staked position lives on a home chain and the token is minted here through a gateway. Adds the bridged token step.",
      templates: ["lido-l2-token-bridge", "lido-steth-wsteth", "rocket-pool-reth"],
    },
    {
      id: "liquid_staking_token.f.fee-sharing",
      title: "Streams protocol fees to stakers",
      detail: "The yield is your own protocol's fees rather than validator rewards. Adds the fee stream step.",
      templates: ["synthetix-multirewards", "peg-staking-vault", "tally-staker"],
    },
    {
      id: "liquid_staking_token.f.validator-pool",
      title: "Runs its own validators",
      detail: "You or a partner operate the validators, so the operator set and its slashing are yours to disclose.",
      templates: ["stakewise-v3-vaults", "rocket-pool-reth"],
    },
    {
      id: "liquid_staking_token.f.wrapper",
      title: "Wraps an existing staking token",
      detail: "The product is a wrapper that shows one growing balance over a token that already exists.",
      templates: ["openzeppelin-erc4626", "lido-steth-wsteth", "frax-frxeth-sfrxeth"],
    },
  ],
  restaking_service: [
    {
      id: "restaking_service.f.own-token",
      title: "Your token as a bond",
      detail: "Operators may post your token beside restaked assets. Adds the bond cap step.",
      templates: ["symbiotic-core"],
    },
    {
      id: "restaking_service.f.multi-core",
      title: "Secured by more than one core",
      detail: "The service registers with two restaking cores, so each registration and its slashing path is tracked.",
      templates: ["eigenlayer-core", "symbiotic-core", "symbiotic-relay-sdk"],
    },
    {
      id: "restaking_service.f.hosted-operators",
      title: "Operators run by partners",
      detail: "Named partners operate the service under an agreement, so admission is a list rather than open.",
      templates: ["eigenlayer-hourglass-avs-template"],
    },
  ],
  liquid_restaking_token: [
    {
      id: "liquid_restaking_token.f.bridged",
      title: "Bridged to this chain",
      detail: "Deposits happen here and restaking happens on the home chain. Adds the bridge step.",
      templates: ["lido-l2-token-bridge", "swell-sweth-rsweth"],
    },
    {
      id: "liquid_restaking_token.f.single-service",
      title: "One service only",
      detail: "The basket is one service, so the receipt token is a vault share over that service alone.",
      templates: ["mellow-lrt-vaults", "openzeppelin-erc4626"],
    },
    {
      id: "liquid_restaking_token.f.points",
      title: "Collects points and rewards",
      detail: "The services pay points or tokens the vault collects for holders, so the claim path and its distribution are part of the product.",
      templates: ["etherfi-weeth", "kelp-rseth", "renzo-ezeth"],
    },
  ],
};
