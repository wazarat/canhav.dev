import type { KitResource } from "@/lib/kits";

const DOCS = "https://docs.pendle.finance";
const DEV = `${DOCS}/boros-dev`;
const API = "https://api-boros.pendle.finance";
const CORE = "https://github.com/pendle-finance/boros-core-public";
const AI = "https://github.com/pendle-finance/pendle-ai";
const AI_RAW = "https://raw.githubusercontent.com/pendle-finance/pendle-ai/main";
const PLUGIN = `${AI}/blob/main/packages/plugins/pendle-boros`;
const PLUGIN_RAW = `${AI_RAW}/packages/plugins/pendle-boros`;

const SUBSECTORS = ["fixed_income", "leveraged_yield"] as const;

function entry(
  r: Omit<KitResource, "family" | "shapes" | "subsectors" | "priority" | "flags">,
): KitResource {
  return {
    ...r,
    family: "boros",
    shapes: "all",
    subsectors: SUBSECTORS,
    priority: "deep_dive",
    flags: ["not_on_robinhood"],
  };
}

/**
 * Boros family. Interest rate swaps on perpetual funding rates, standardised
 * as yield units. It runs on Arbitrum, not on Robinhood Chain, so every
 * entry is background reading, deep dive, and flagged not_on_robinhood. It
 * appears for fixed income and leveraged yield projects only. Ids are
 * immutable.
 */
export const BOROS_RESOURCES: readonly KitResource[] = [
  // -- what it is ------------------------------------------------------------------
  entry({
    id: "boros.litepaper",
    title: "Boros litepaper",
    kind: "paper",
    href: `${DEV}/LitePaper`,
    why: "The short version. Funding rates become a tradable fixed-versus-floating rate, which is the other way to build fixed income.",
    steps: ["basics"],
  }),
  entry({
    id: "boros.whitepaper",
    title: "Boros whitepaper",
    kind: "paper",
    href: `${CORE}/blob/main/whitepapers/Boros.pdf`,
    why: "The full mechanism, margin model and settlement math. Read it before designing any product that pays a funding rate.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.amm-whitepaper",
    title: "Boros AMM whitepaper",
    kind: "paper",
    href: `${CORE}/blob/main/whitepapers/AMM.pdf`,
    why: "How a rate, rather than a token, is priced by a pool. Different curve, same discipline about time.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.architecture",
    title: "High level architecture",
    kind: "docs",
    href: `${DEV}/HighLevelArchitecture`,
    why: "Markets, the market hub, the router and the off-chain order flow in one diagram.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.user-docs",
    title: "User documentation",
    kind: "docs",
    href: `${DOCS}/boros-docs/Introduction`,
    why: "The product as its users see it. Long and short yield units, positions, and what settlement looks like on screen.",
    steps: ["basics"],
  }),
  entry({
    id: "boros.glossary",
    title: "Glossary",
    kind: "docs",
    href: `${DEV}/Backend/glossary`,
    why: "Yield unit, mark rate, implied rate, funding interval. Borrow the vocabulary rather than inventing your own.",
    steps: ["basics"],
  }),

  // -- mechanics ----------------------------------------------------------------------
  entry({
    id: "boros.margin",
    title: "Margin",
    kind: "docs",
    href: `${DEV}/Mechanics/Margin`,
    why: "Initial and maintenance margin on a rate position. The template for any leveraged rate product's risk page.",
    steps: ["security"],
  }),
  entry({
    id: "boros.settlement",
    title: "Settlement",
    kind: "docs",
    href: `${DEV}/Mechanics/Settlement`,
    why: "How fixed and floating legs settle each interval. This is the cash flow a structured product would pass through.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.fees",
    title: "Fees",
    kind: "docs",
    href: `${DEV}/Mechanics/Fees`,
    why: "Trading, settlement and liquidation costs. Net them out before quoting a rate to anyone.",
    steps: ["reality"],
  }),
  entry({
    id: "boros.order-book",
    title: "Order book",
    kind: "docs",
    href: `${DEV}/Mechanics/OrderBook`,
    why: "Execution and rate formation on the book side, and how it sits next to the pool.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.amm",
    title: "AMM mechanics",
    kind: "docs",
    href: `${DEV}/Mechanics/AMM`,
    why: "The pool side of execution, the developer view of the whitepaper's curve.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.p2p-marketplace",
    title: "Peer to peer marketplace",
    kind: "docs",
    href: `${DOCS}/boros-docs/boros-systems/p2p-marketplace`,
    why: "Matching a fixed payer with a floating payer directly. The pattern behind a private rate agreement between two apps.",
    steps: ["architecture"],
  }),

  // -- backend, API and SDK ----------------------------------------------------------
  entry({
    id: "boros.backend-overview",
    title: "Backend overview",
    kind: "docs",
    href: `${DEV}/Backend/overview`,
    why: "The hosted services, what needs a wallet and what does not, and the computing unit budget every request spends.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.api",
    title: "REST API",
    kind: "docs",
    href: `${DEV}/Backend/api`,
    why: "Markets, accounts and calldata over REST. The migration note matters because the mounts moved.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.openapi",
    title: "Open API specification",
    kind: "spec",
    href: `${API}/open-api/docs`,
    why: "The machine-readable surface for markets, accounts and calldata. Generate a client from it.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.send-txs-bot",
    title: "Send transactions bot specification",
    kind: "spec",
    href: `${API}/send-txs-bot/docs`,
    rawHref: `${API}/send-txs-bot/docs-json`,
    why: "The signing bot's own API, for an automated strategy that submits orders without a browser wallet.",
    steps: ["architecture", "security"],
  }),
  entry({
    id: "boros.websocket",
    title: "WebSocket API",
    kind: "docs",
    href: `${DEV}/Backend/websocket`,
    why: "Live rates and order updates. What a monitoring or hedging loop subscribes to.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.sdk",
    title: "SDK",
    kind: "docs",
    href: `${DEV}/Backend/sdk`,
    why: "The TypeScript wrapper over the API with the escape hatch to the raw OpenAPI client.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.agent-trading",
    title: "Agent trading",
    kind: "docs",
    href: `${DEV}/Backend/agent`,
    why: "How an agent account trades on behalf of a user with bounded permissions. The approval model is worth copying.",
    steps: ["architecture", "security"],
  }),
  entry({
    id: "boros.bot-quickstart",
    title: "Bot quickstart",
    kind: "docs",
    href: `${DEV}/Backend/bot-quickstart`,
    why: "From zero to a running strategy bot. The fastest way to see the whole loop before designing your own.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.historical-data",
    title: "Historical data",
    kind: "dataset",
    href: `${DEV}/Backend/historical-data`,
    why: "Funding and rate history for backtesting. Any fixed-versus-floating claim you make to users should survive this data.",
    steps: ["reality"],
  }),
  entry({
    id: "boros.api-examples",
    title: "API examples repository",
    kind: "repo",
    href: "https://github.com/pendle-finance/boros-api-examples",
    rawHref: "https://raw.githubusercontent.com/pendle-finance/boros-api-examples/main/README.md",
    why: "Numbered example scripts from an agent account to a gas top-up. Copy, do not transcribe.",
    steps: ["architecture"],
  }),

  // -- agent tooling ----------------------------------------------------------------
  entry({
    id: "boros.mcp",
    title: "Boros local MCP server",
    kind: "tool",
    href: `${PLUGIN}/README.md`,
    rawHref: `${PLUGIN_RAW}/README.md`,
    why: "Runs locally over npx because wallet signatures are brokered through a loopback callback. The security write-up explains why remote is not offered.",
    steps: ["basics", "security"],
  }),
  entry({
    id: "boros.skill-trading",
    title: "Trading skill",
    kind: "skill",
    href: `${PLUGIN}/skills/boros-trading/SKILL.md`,
    rawHref: `${PLUGIN_RAW}/skills/boros-trading/SKILL.md`,
    why: "How an agent opens, sizes and closes a rate position, with the guardrails the protocol team put in.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.skill-data",
    title: "Data skill",
    kind: "skill",
    href: `${PLUGIN}/skills/boros-data/SKILL.md`,
    rawHref: `${PLUGIN_RAW}/skills/boros-data/SKILL.md`,
    why: "Reading markets, rates and history through the tools rather than the raw API.",
    steps: ["basics"],
  }),
  entry({
    id: "boros.skill-portfolio",
    title: "Portfolio and account skill",
    kind: "skill",
    href: `${PLUGIN}/skills/boros-portfolio-account/SKILL.md`,
    rawHref: `${PLUGIN_RAW}/skills/boros-portfolio-account/SKILL.md`,
    why: "Positions, margin and account health from an agent's point of view.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.advisor",
    title: "Advisor agent definition",
    kind: "skill",
    href: `${PLUGIN}/agents/advisor.md`,
    rawHref: `${PLUGIN_RAW}/agents/advisor.md`,
    why: "A complete agent persona for rate strategy, from data gathering to sizing to the warnings it must give. Study the structure even if you never trade.",
    steps: ["basics", "architecture"],
  }),

  // -- contracts -------------------------------------------------------------------
  entry({
    id: "boros.core-repo",
    title: "Core contracts repository",
    kind: "repo",
    href: CORE,
    rawHref: "https://raw.githubusercontent.com/pendle-finance/boros-core-public/main/README.md",
    why: "The on-chain implementation, with deployments, whitepapers and audits in the same tree.",
    steps: ["architecture"],
  }),
  entry({
    id: "boros.audits",
    title: "Audit reports",
    kind: "repo",
    href: `${CORE}/tree/main/audits`,
    why: "What reviewers found in a margin and settlement engine. Useful reading for anyone writing one.",
    steps: ["security"],
  }),
  entry({
    id: "boros.deployments",
    title: "Deployment manifests",
    kind: "addresses",
    href: `${CORE}/tree/main/deployments`,
    why: "Where the contracts live. None of them is on Robinhood Chain, which is the whole point of the flag on this family.",
    steps: ["reality"],
  }),

  // -- the venues the rates come from -------------------------------------------------
  entry({
    id: "binance.funding-rate-api",
    title: "Binance funding rate API",
    kind: "docs",
    href: "https://developers.binance.com/docs/derivatives/coin-margined-futures/market-data/rest-api/Get-Funding-Info",
    why: "One of the underlying rates. If a product quotes a funding rate, this is where the number is born.",
    steps: ["reality"],
  }),
  entry({
    id: "hyperliquid.funding",
    title: "Hyperliquid funding documentation",
    kind: "docs",
    href: "https://hyperliquid.gitbook.io/hyperliquid-docs/trading/funding",
    why: "The other common underlying. Its interval and formula differ, which is exactly the kind of detail a rate label must carry.",
    steps: ["reality"],
  }),
];
