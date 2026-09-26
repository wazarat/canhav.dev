/**
 * Config and validators for the /launch page (testnet token launchpad), the
 * Launch tab in the primary nav. Nothing here touches a network.
 */

/** Chain metadata — single source for the hidden launchpad pages and the
 *  future wallet layer's hard network guard. */
export const LAUNCH_CHAIN = {
  name: "Robinhood Chain Testnet",
  chainId: 46630,
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  // v4 factory (Solady LibClone validation swap; ABI identical to v3, owned
  // by the timelock). v1 (0x1dAaa829…c909), v2 (0x10F33eE0…9Bc0) and v3
  // (0xD6166E15…d4c5) are paused but their tokens remain indexed and browsable.
  factoryAddress: "0x30Db3A828F65B92434c6aDB27AEeD01850277b08",
  // TimelockController that owns the factory: every admin change (fee,
  // treasury, implementation, unpause) waits out its public delay.
  timelockAddress: "0x080cCDC07e2a0a5D11e9dDaA873ea68F540109ae",
  // Admin-less singletons: milestone-dated token lockups + content-addressed
  // progress-update anchor. No owner, no attester, nothing to rug.
  escrowAddress: "0x90C71DBA8A61Da14CA699f72D311e404094Cf192",
  updatesAddress: "0x31358209375591b1285EaA437c2c9f189c48D073",
  // Fixed-price allocation sales: fee-free (zero platform cut), proceeds
  // claimable only in milestone-dated tranches. Also admin-less.
  saleAddress: "0x869cE70ff8174802d98D26835ce4040754Ad284A",
  // Minimal AMM (token ⇄ ETH pools). 0.30% LP fee; opt-in protocol fee
  // (hard-capped, 70/30 project/platform enforced in bytecode) routed to the
  // FeeSplitter. Both knobs owned by the timelock.
  ammAddress: "0xDd070b1f8e000D27491A3d38543ef0D72C758Df4",
  splitterAddress: "0x9FDFae007b65d4c8F3CCA6AC242E3f141eC9DA18",
} as const;

/**
 * Supply the factory mints when the launcher does not bring their own number.
 * Ground-up launches are fixed at this; a launch started from a published token
 * design keeps that document's total, because the number is inside the snapshot
 * hash committed on-chain.
 */
export const LAUNCH_SUPPLY = 1_000_000_000;

/** Hard ceiling the factory tolerates, in whole tokens (1T). */
export const LAUNCH_SUPPLY_MAX = 1_000_000_000_000;

/**
 * Pool seeding at launch. The ETH in the Developer buy field becomes the first
 * liquidity of a LaunchAMM pool, paired with this share of the supply from the
 * creator's wallet. The creator holds the resulting liquidity shares. The
 * first deposit fixes the opening price at ETH divided by tokens.
 *
 * supplyShareBps  80% in the market matches what launchpads put on their
 *                 curves and leaves a working balance for escrow and sales.
 * optInProtocolFee  the same default as the token page's create-pool flow
 *                 (components/launch/PoolActions.tsx) and scripts/e2e-amm.mjs.
 */
export const LAUNCH_POOL = {
  supplyShareBps: 8_000,
  optInProtocolFee: true,
  /** Wallet confirmations when seeding, in order. */
  steps: ["launch", "createPool", "approve", "addLiquidity"],
  labels: {
    pool: "Pool",
    createPool: "Creating pool",
    approve: "Approving tokens",
    addLiquidity: "Adding liquidity",
  },
} as const;

/** Whole-number percent of the supply that goes into the pool, for copy. */
export const LAUNCH_POOL_SHARE_PCT = LAUNCH_POOL.supplyShareBps / 100;

/**
 * The optional ETH the creator pairs with part of the supply to open the pool
 * right after launch. There is no bonding curve, so nothing is bought; the
 * ETH and tokens become the creator's own liquidity shares, withdrawable at
 * any time. min keeps a pool from opening on dust, max is a testnet sanity cap.
 */
export const LAUNCH_DEV_BUY = {
  min: "0.0001",
  max: "10",
  suffix: "ETH",
  label: "Developer buy",
  placeholder: "0.00",
  hint: `Optional. Seeds a trading pool with this ETH and ${LAUNCH_POOL_SHARE_PCT}% of your supply right after launch. You hold the shares and can withdraw any time.`,
  balanceLabel: "Balance",
  balanceUnavailable: "Balance unavailable",
  none: "None",
  /** Digits with at most one dot and 18 decimals, so parseEther always accepts it. */
  pattern: /^\d*\.?\d{0,18}$/,
} as const;

/**
 * The launch parameters shown beside the form. Every row says what the
 * deployed contracts do. Nothing here promises a mechanism contracts/src does
 * not have.
 *
 * pairedWith  LaunchAMM pools are token/native-ETH. There is no WETH anywhere.
 * tradeFee    LP_FEE_BPS = 30 in contracts/src/LaunchAMM.sol. A further 20 bps
 *             protocol fee exists but is opt-in at pool creation, so it is not
 *             part of the number every launch pays.
 * launchWindow  no snipe tax or anti-bot window exists. Trading starts when a
 *             pool gets its first liquidity, nothing gates the first block.
 * graduation  no bonding curve, so nothing to graduate from. The LaunchAMM
 *             pool is the market from the first deposit.
 * liquidity   LaunchAMM.removeLiquidity has no lock. Only MINIMUM_LIQUIDITY
 *             (1e3 shares) burns forever, which does not lock the creator's
 *             position. A curve with locked liquidity is a separate milestone.
 */
export const LAUNCH_PARAMS = {
  pairedWith: "ETH",
  tradeFee: "0.30%",
  launchWindow: "None. Trading opens the moment a pool is seeded",
  graduation: "None. The pool is the market from day one",
  liquidity: "Seeded by you, withdrawable any time, never locked",
  liquidityNone: "None until a pool is seeded, withdrawable any time, never locked",
  labels: {
    totalSupply: "Total supply",
    launchFee: "Launch fee",
    devBuy: "Developer buy",
    pairedWith: "Paired with",
    tradeFee: "Trade fee",
    launchWindow: "Launch window",
    graduation: "Graduation",
    liquidity: "Liquidity",
    openingPrice: "Opening price",
  },
  feeLoading: "Reading fee",
  feeFree: "Free",
} as const;

/** Vesting form constraints (client-side mirror of factory validation). */
export const LAUNCH_VESTING = {
  percent: { min: 1, max: 100 },
  durationDays: { min: 1, max: 3650 },
  cliffDays: { min: 0 },
} as const;

export function validateVesting(v: {
  percent: number;
  durationDays: number;
  cliffDays: number;
}): string | undefined {
  const L = LAUNCH_VESTING;
  if (!Number.isInteger(v.percent) || v.percent < L.percent.min || v.percent > L.percent.max)
    return `Vested percent must be ${L.percent.min}–${L.percent.max}.`;
  if (
    !Number.isInteger(v.durationDays) ||
    v.durationDays < L.durationDays.min ||
    v.durationDays > L.durationDays.max
  )
    return `Duration must be ${L.durationDays.min}–${L.durationDays.max} days.`;
  if (!Number.isInteger(v.cliffDays) || v.cliffDays < L.cliffDays.min)
    return "Cliff must be 0 or more days.";
  if (v.cliffDays > v.durationDays) return "Cliff cannot exceed the duration.";
  return undefined;
}

export const LAUNCH_FORM = {
  name: {
    max: 32,
    pattern: /^[A-Za-z0-9 ]*$/,
    strip: /[^A-Za-z0-9 ]/g,
    hint: "Letters, numbers, and spaces. 32 characters max.",
  },
  ticker: {
    max: 10,
    pattern: /^[A-Z0-9]*$/,
    strip: /[^A-Z0-9]/g,
    hint: "Letters and numbers. 10 characters max.",
  },
  description: {
    max: 256,
    // Rejects obvious URLs: schemes, www., or bare domains with a path.
    linkPattern: /(https?:\/\/|www\.|\.[a-z]{2,}\/)/i,
    hint: "No links.",
  },
  image: {
    maxBytes: 4 * 1024 * 1024,
    types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    hint: "PNG, JPG, WEBP or GIF · max 4 MB",
  },
  xHandle: {
    max: 15,
    pattern: /^[A-Za-z0-9_]*$/,
    strip: /[^A-Za-z0-9_]/g,
    prefix: "x.com/",
    // A pasted https://x.com/name, twitter.com/name or @name.
    pasteStrip: /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/|^@/i,
  },
  telegram: {
    min: 5,
    max: 32,
    pattern: /^[A-Za-z0-9_]*$/,
    strip: /[^A-Za-z0-9_]/g,
    prefix: "t.me/",
    // A pasted https://t.me/name, telegram.me/name or @name.
    pasteStrip: /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/|^@/i,
  },
  website: {
    hint: "https:// URL",
  },
} as const;

/**
 * Copy and commands for the MCP connection card. Two mounts exist. The shared
 * server at /mcp carries the launch and design tools; a project-scoped server
 * at /mcp/p/<project id> carries tools bound to one project. URLs and shell
 * commands are exact strings and must stay copy-paste safe.
 *
 * The base stays on www. SITE.url is the apex, and an apex to www redirect
 * would break MCP clients that do not re-POST.
 */
const MCP_BASE = "https://www.canhav.com";

/**
 * A Claude Code server name for one project. Must be unique on the user's
 * machine and legal as a CLI argument, and drafts start with an empty name.
 */
export function mcpAlias(name: string, projectId: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/, "");
  return slug ? `canhav-${slug}` : `canhav-${projectId.slice(0, 8)}`;
}

export const MCP_CONNECT = {
  baseUrl: MCP_BASE,
  serverUrl: `${MCP_BASE}/mcp`,
  docsUrl: "https://docs.canhav.com/ai-and-ide/export-and-mcp",
  installCommand: "curl -fsSL https://claude.ai/install.sh | bash",
  addCommand: `claude mcp add --transport http canhav ${MCP_BASE}/mcp`,
  title: "Read this launch from your agent",
  intro:
    "Every CanHav launch is readable over MCP. Connect once and ask your agent about the token, its commitment, sales and pools.",
  steps: {
    install: "Install Claude Code",
    add: "Add the CanHav server",
    ask: "Ask about this launch",
    askAny: "Ask about launches",
    addProject: "Add this project's server",
    askProject: "Ask about this project",
  },
  promptFor: (address: string, committed: boolean) =>
    committed
      ? `Use the canhav get_launch tool for ${address} and summarize the commitment and its milestones.`
      : `Use the canhav get_launch tool for ${address} and summarize the token, its vesting, sales and pool.`,
  promptAny: "Use the canhav list_launches tool and show the newest launches.",
  projectServerUrl: (projectId: string) => `${MCP_BASE}/mcp/p/${projectId}`,
  projectAddCommand: (projectId: string, name: string) =>
    `claude mcp add --transport http ${mcpAlias(name, projectId)} ${MCP_BASE}/mcp/p/${projectId}`,
  projectPrompt: (projectId: string, name: string) =>
    `Use the ${mcpAlias(name, projectId)} get_project_status tool and tell me what is left before this project can launch.`,
  projectTitle: "Read this project from your agent",
  projectIntro:
    "This project has its own MCP server. Add it and your agent sees this project, the token design linked to it and the token it deployed. Nothing else.",
  projectNote:
    "The server is yours alone. Every tool checks that the project belongs to the signed-in account.",
  desktopNote:
    "The Claude desktop app can add the same server URL as a custom connector.",
  docsLabel: "Every tool in the docs",
  landingPointer: "Every launch is readable over MCP.",
} as const;

export const LAUNCH_COPY = {
  kicker: "Launchpad",
  title: "Launch a token",
  subtitleLead: "Create a token on Robinhood Chain Testnet in two steps.",
  subtitleDetail:
    "Name it, describe it, add an image and launch. Seed a pool with ETH if you want trading from the first block, and add a commitment if you want one. Any agent can read the launch over MCP.",
  previewTitle: "Your token",
  exploreTitle: "Recent launches",
  exploreLead:
    "Every token launched through the CanHav factory, newest first. Open one to see its commitment, sales and pool, or read it from your agent.",
} as const;

/**
 * Wallets that appear via EIP-6963 but cannot add custom EVM chains, so they
 * can never reach Robinhood Chain Testnet (46630). Keyed by rdns. They're
 * shown disabled in the picker with the reason, rather than silently failing.
 */
export const UNSUPPORTED_WALLETS: Record<string, string> = {
  "app.keplr": "Keplr can't add custom EVM testnets",
  "app.hashpack": "HashPack is Hedera-only",
};

export function validateName(value: string): string | undefined {
  if (!value) return undefined;
  if (value.length > LAUNCH_FORM.name.max) return `Max ${LAUNCH_FORM.name.max} characters.`;
  if (!LAUNCH_FORM.name.pattern.test(value)) return "Letters, numbers, and spaces only.";
  return undefined;
}

export function validateTicker(value: string): string | undefined {
  if (!value) return undefined;
  if (value.length > LAUNCH_FORM.ticker.max) return `Max ${LAUNCH_FORM.ticker.max} characters.`;
  if (!LAUNCH_FORM.ticker.pattern.test(value)) return "Uppercase letters and numbers only.";
  return undefined;
}

export function validateDescription(value: string): string | undefined {
  if (!value) return undefined;
  if (value.length > LAUNCH_FORM.description.max)
    return `Max ${LAUNCH_FORM.description.max} characters.`;
  if (LAUNCH_FORM.description.linkPattern.test(value)) return "Links are not allowed.";
  return undefined;
}

export function validateImageFile(file: File): string | undefined {
  if (!(LAUNCH_FORM.image.types as readonly string[]).includes(file.type))
    return "Unsupported file type. Use PNG, JPG, WEBP, or GIF.";
  if (file.size > LAUNCH_FORM.image.maxBytes) return "File is larger than 4 MB.";
  return undefined;
}

/** Reduces a pasted profile URL or @handle to the bare handle, then strips illegal characters. */
export function normalizeXHandle(raw: string): string {
  return raw
    .replace(LAUNCH_FORM.xHandle.pasteStrip, "")
    .replace(LAUNCH_FORM.xHandle.strip, "")
    .slice(0, LAUNCH_FORM.xHandle.max);
}

export function validateXHandle(value: string): string | undefined {
  if (!value) return undefined;
  if (value.length > LAUNCH_FORM.xHandle.max) return `Max ${LAUNCH_FORM.xHandle.max} characters.`;
  if (!LAUNCH_FORM.xHandle.pattern.test(value)) return "Letters, numbers, and underscores only.";
  return undefined;
}

/** Reduces a pasted t.me link or @handle to the bare username, then strips illegal characters. */
export function normalizeTelegram(raw: string): string {
  return raw
    .replace(LAUNCH_FORM.telegram.pasteStrip, "")
    .replace(LAUNCH_FORM.telegram.strip, "")
    .slice(0, LAUNCH_FORM.telegram.max);
}

export function validateTelegram(value: string): string | undefined {
  if (!value) return undefined;
  if (value.length < LAUNCH_FORM.telegram.min)
    return `At least ${LAUNCH_FORM.telegram.min} characters.`;
  if (value.length > LAUNCH_FORM.telegram.max) return `Max ${LAUNCH_FORM.telegram.max} characters.`;
  if (!LAUNCH_FORM.telegram.pattern.test(value)) return "Letters, numbers, and underscores only.";
  return undefined;
}

/**
 * Format and range only. Whether the wallet can cover it is checked in the
 * form, where the balance and the live launch fee are.
 */
export function validateDevBuy(value: string): string | undefined {
  if (!value) return undefined;
  if (!LAUNCH_DEV_BUY.pattern.test(value) || value === ".") return "Enter an ETH amount, like 0.05.";
  const n = Number(value);
  if (!(n > 0)) return "Enter an amount above zero, or leave it empty.";
  if (n < Number(LAUNCH_DEV_BUY.min)) return `At least ${LAUNCH_DEV_BUY.min} ETH.`;
  if (n > Number(LAUNCH_DEV_BUY.max)) return `Max ${LAUNCH_DEV_BUY.max} ETH.`;
  return undefined;
}

export function validateWebsite(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:")
      return "Must be an http(s) URL.";
    return undefined;
  } catch {
    return "Enter a full URL, like https://example.com.";
  }
}
