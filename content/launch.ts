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
 * The launch parameters shown beside the form. Only rows backed by deployed
 * code carry a value; the rest are marked soon rather than given a number the
 * contracts would not honour.
 *
 * pairedWith  LaunchAMM pools are token/native-ETH. There is no WETH anywhere.
 * tradeFee    LP_FEE_BPS = 30 in contracts/src/LaunchAMM.sol. A further 20 bps
 *             protocol fee exists but is opt-in at pool creation, so it is not
 *             part of the number every launch pays.
 * launchWindow, graduation, liquidity  no snipe tax, no bonding curve and no
 *             liquidity lock exist in contracts/src today.
 */
export const LAUNCH_PARAMS = {
  pairedWith: "ETH",
  tradeFee: "0.30%",
  soon: ["launchWindow", "graduation", "liquidity"],
  labels: {
    totalSupply: "Total supply",
    launchFee: "Launch fee",
    pairedWith: "Paired with",
    tradeFee: "Trade fee",
    launchWindow: "Launch window",
    graduation: "Graduation",
    liquidity: "Liquidity",
  },
  feeLoading: "Reading fee",
  feeFree: "Free",
  soonLabel: "Soon",
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
    hint: "No links. 256 characters max.",
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
    "Name it and launch. Add a commitment if you want one, and its hash goes on-chain with the token. Any agent can read the launch over MCP.",
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

export function validateXHandle(value: string): string | undefined {
  if (!value) return undefined;
  if (value.length > LAUNCH_FORM.xHandle.max) return `Max ${LAUNCH_FORM.xHandle.max} characters.`;
  if (!LAUNCH_FORM.xHandle.pattern.test(value)) return "Letters, numbers, and underscores only.";
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
