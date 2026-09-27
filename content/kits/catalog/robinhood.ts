import type { KitResource } from "@/lib/kits";

const DOCS = "https://docs.robinhood.com/chain";

/**
 * Robinhood Chain family. Chain primitives that every protocol layer
 * consumes, so they appear exactly once. The full master list from the
 * owner's research lands in M28. Ids are immutable.
 */
export const ROBINHOOD_RESOURCES: readonly KitResource[] = [
  {
    id: "robinhood.chain-docs",
    family: "robinhood",
    title: "Robinhood Chain developer docs",
    kind: "docs",
    href: `${DOCS}/`,
    why: "Read first. Architecture, EVM compatibility, sequencing, account abstraction and the intended real-world asset use.",
    shapes: "all",
    steps: ["basics", "architecture"],
    priority: "core",
    readOrder: 21,
  },
  {
    id: "robinhood.differences-from-ethereum",
    family: "robinhood",
    title: "Differences from Ethereum",
    kind: "docs",
    href: `${DOCS}/differences-from-ethereum`,
    why: "Block numbers, randomness, coinbase, gas and cross-layer sender behaviour all differ. Mandatory before writing a contract.",
    shapes: "all",
    steps: ["architecture"],
    priority: "recommended",
  },
  {
    id: "robinhood.deploy-smart-contracts",
    family: "robinhood",
    title: "Deploy smart contracts",
    kind: "docs",
    href: `${DOCS}/deploy-smart-contracts`,
    why: "Foundry and Hardhat setup and the recommendation to test on testnet 46630 before mainnet.",
    shapes: "all",
    steps: ["reality"],
    priority: "recommended",
  },
  {
    id: "robinhood.oracles-and-price-feeds",
    family: "robinhood",
    title: "Oracles and price feeds",
    kind: "docs",
    href: `${DOCS}/oracles-and-price-feeds`,
    why: "Which feeds exist on the chain and the staleness and sequencer checks the chain team asks lending systems to make.",
    shapes: "all",
    steps: ["architecture", "security"],
    priority: "recommended",
  },
  {
    id: "robinhood.transaction-finality",
    family: "robinhood",
    title: "Transaction finality",
    kind: "docs",
    href: `${DOCS}/transaction-finality`,
    why: "Sequencer confirmation, posting to Ethereum and Ethereum finality are separate stages. Deposits and collateral moves should know which one they trust.",
    shapes: "all",
    steps: ["reality"],
    priority: "recommended",
  },
  {
    id: "robinhood.testnet-explorer",
    family: "robinhood",
    title: "Testnet 46630 explorer, RPC and faucet",
    kind: "addresses",
    href: "https://explorer.testnet.chain.robinhood.com",
    why: "The public testnet endpoints. RPC at rpc.testnet.chain.robinhood.com, faucet at faucet.testnet.chain.robinhood.com. Public RPCs are rate limited.",
    shapes: "all",
    steps: ["reality"],
    priority: "core",
    readOrder: 22,
    flags: ["testnet_only"],
  },
];
