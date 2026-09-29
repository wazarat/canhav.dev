/**
 * Config and validators for the /launch page (testnet token launchpad), the
 * Launch tab in the primary nav. Nothing here touches a network.
 */
import { formatEther } from "viem";

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
  // Bonding-curve launcher (M19a, 2026-09-29, block 126200516). Clones the
  // same LaunchToken implementation, holds the supply on a constant-product
  // curve with virtual reserves, taxes buys in the first minute and holds
  // the tax for graduation, and at the threshold seeds a LaunchAMM pool whose
  // shares it keeps forever. Fee and pause owned by the timelock.
  curveAddress: "0xb2e1F2df7775d17CE70c8CE7586c7bb01bD10981",
} as const;

/**
 * Mirrors of CurveLauncher's immutables (contracts/src/CurveLauncher.sol),
 * read once at build time for copy and client maths. scripts/preflight-
 * curve.mjs compares every value against the deployed contract, so a
 * redeploy with different numbers fails loudly here rather than quietly on
 * the card.
 */
export const LAUNCH_CURVE = {
  /** CurveLauncher.graduationEth, real ETH raised that triggers graduation. */
  thresholdWei: 100_000_000_000_000_000n,
  thresholdEth: "0.1",
  /** CurveLauncher.snipeWindowSeconds. Timestamp based: block.number on
   *  Arbitrum Nitro chains reports the parent chain. */
  windowSeconds: 60,
  /** CurveLauncher.snipeTaxBps on buys inside the window. */
  snipeTaxBps: 2000,
  /** CurveLauncher.curveShareBps, share of supply sold on the curve; the
   *  rest seeds the pool at graduation. */
  curveShareBps: 8000,
  /** CurveLauncher.virtualEthReserve, derived so the curve's end price equals
   *  the pool's opening price. */
  virtualEthWei: 33_333_333_333_333_333n,
  /** CurveLauncher.maxDevBuy, the cap on the developer buy inside launch(). */
  devBuyMaxWei: 5_000_000_000_000_000n,
  /** Slippage choices for the token page buy and sell form, in percent. */
  slippageOptions: [1, 3, 5],
  labels: {
    title: "Bonding curve",
    live: "On the curve",
    window: "Snipe tax window",
    graduated: "Graduated",
    raised: "Raised",
    taxPot: "Tax held for graduation",
    price: "Price",
    trades: "Trades",
    buy: "Buy with ETH",
    sell: "Sell for ETH",
    slippage: "Slippage",
    locked: "Liquidity locked",
  },
} as const;

/** Whole-number percents for copy. */
export const LAUNCH_CURVE_SHARE_PCT = LAUNCH_CURVE.curveShareBps / 100;
export const LAUNCH_CURVE_TAX_PCT = LAUNCH_CURVE.snipeTaxBps / 100;

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
 * The optional developer buy, made inside the launch transaction as the
 * first buy on the curve, exempt from the snipe tax and capped by the
 * launcher (LAUNCH_CURVE.devBuyMaxWei). min keeps the field from accepting
 * dust the curve would round to nothing.
 */
export const LAUNCH_DEV_BUY = {
  min: "0.0001",
  max: formatEther(LAUNCH_CURVE.devBuyMaxWei),
  suffix: "ETH",
  label: "Developer buy",
  placeholder: "0.00",
  hint: "Optional. Your first buy on the curve, made inside the launch transaction before anyone else can trade. The tokens land in your wallet at the opening price.",
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
 * pairedWith    LaunchAMM pools are token/native-ETH. There is no WETH anywhere.
 * tradeFee      the curve charges nothing per trade. LP_FEE_BPS = 30 in
 *               contracts/src/LaunchAMM.sol applies once the pool exists.
 * curveShare    CurveLauncher.curveShareBps; the rest seeds the pool.
 * launchWindow  CurveLauncher.snipeWindowSeconds and snipeTaxBps, buys only.
 * graduation    CurveLauncher.graduationEth and _graduate().
 * liquidity     the launcher keeps the pool shares and has no removeLiquidity
 *               path, and LaunchAMM shares cannot be transferred or burned.
 */
export const LAUNCH_PARAMS = {
  pairedWith: "ETH",
  tradeFee: "None on the curve, 0.30% in the pool after graduation",
  curveShare: `${LAUNCH_CURVE_SHARE_PCT}% of supply, the rest seeds the pool`,
  launchWindow: `First ${LAUNCH_CURVE.windowSeconds} seconds, ${LAUNCH_CURVE_TAX_PCT}% snipe tax on buys`,
  graduation: `At ${LAUNCH_CURVE.thresholdEth} ETH raised, the curve seeds a locked pool`,
  liquidity: "Locked forever in the pool at graduation",
  labels: {
    totalSupply: "Total supply",
    launchFee: "Launch fee",
    devBuy: "Developer buy",
    curveShare: "Sold on the curve",
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
    loadKit: "Load the resource pack",
  },
  promptFor: (address: string, committed: boolean) =>
    committed
      ? `Use the canhav get_launch tool for ${address} and summarize the commitment and its milestones.`
      : `Use the canhav get_launch tool for ${address} and summarize the token, its curve, vesting, sales and pool.`,
  promptAny: "Use the canhav list_launches tool and show the newest launches.",
  projectServerUrl: (projectId: string) => `${MCP_BASE}/mcp/p/${projectId}`,
  projectAddCommand: (projectId: string, name: string) =>
    `claude mcp add --transport http ${mcpAlias(name, projectId)} ${MCP_BASE}/mcp/p/${projectId}`,
  projectPrompt: (projectId: string, name: string) =>
    `Use the ${mcpAlias(name, projectId)} get_project_status tool and tell me what is left before this project can launch.`,
  kitPrompt: (projectId: string, name: string) =>
    `Use the ${mcpAlias(name, projectId)} get_resource_pack tool, fetch every core resource in readFirst order, and tell me what each one requires of this project before we write code. Respect the mainnet_only, not_on_robinhood and self_deploy flags when you propose where to deploy.`,
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

/**
 * The full connection guide, a popup opened from the project's MCP card.
 * Reading and writing are separate sections because writing is a separate
 * decision the owner makes per project (Agent changes on the project page).
 */
export const MCP_GUIDE = {
  open: "Open the full guide",
  title: "Connect your agent to this project",
  lead: "Everything from a first install to an agent that fills in this project for you. Reading works as soon as you connect. Writing is a separate step that you switch on.",
  close: "Close",
  sections: {
    before: {
      title: "Before you start",
      items: [
        "A CanHav account, the one that owns this project.",
        "Claude Code installed on your computer. The command below installs it on macOS and Linux.",
        "A terminal open in the folder where you are building this project, so the agent can read your code too.",
      ],
    },
    connect: {
      title: "Connect",
      add: "Add this project's server",
      addNote: "Run this once in your terminal. It saves the server for the folder you are in.",
      authTitle: "Sign in",
      auth: [
        "Start Claude Code by typing claude in the same folder.",
        "Type /mcp and press enter.",
        "Pick this project's server from the list, then pick Authenticate.",
        "Your browser opens. Sign in with the CanHav account that owns this project and approve.",
        "Back in the terminal the server shows as connected.",
      ],
      check: "Check that it is connected",
      checkCommand: "claude mcp list",
    },
    read: {
      title: "Read",
      lead: "Reading needs no setting. These prompts are a good first three.",
      status: "What is left before launch",
      pack: "Load the resource pack",
      packNone: "The resource pack opens once this project has a product shape, under What are you building in Basics.",
      review: "Walk the pre-launch review",
      reviewNote: "This one is a slash command. Type it in Claude Code.",
    },
    write: {
      title: "Write",
      lead: "An agent can fill in the project steps, tick build steps and edit the linked token design. It never publishes. You choose how it writes, and you can change your mind at any time.",
      modeLabel: "Agent writes for this project",
      loading: "Checking the setting",
      unavailable: "Agent writes are not open on this project yet.",
      off: "Writes are off, so the agent can only read. Pick a mode above to let it write.",
      propose: "The agent proposes. Each change waits under Agent changes on this page until you accept or reject it.",
      direct: "The agent writes straight into the draft. Each change is listed under Agent changes on this page.",
      already: "Added the server before writing was available? You do not need to add it again. Type /mcp in Claude Code, pick the server and reconnect, and the write tools appear.",
      fill: "Fill in the architecture step",
      steps: "Tick the build steps that are done",
      token: "Work on the linked token design",
      review: "Review what the agent sent",
      reviewBody: "Scroll to Agent changes on this page. Proposals show the current value next to the agent's value.",
      goToChanges: "Go to Agent changes",
      cannot: "What an agent cannot do",
      cannotItems: [
        "Publish or unpublish.",
        "Choose sectors, subsectors or what you are building.",
        "Tick the distribution acknowledgement.",
        "Link or unlink a token design.",
      ],
    },
    other: {
      title: "Other apps",
      body: "The Claude desktop app and other MCP clients can use the same server. Add it as a custom connector with this address and sign in with the same account.",
      url: "Server address",
    },
    trouble: {
      title: "If something goes wrong",
      items: [
        {
          q: "Sign in fails or the browser never opens",
          a: "Type /mcp, pick the server and choose Authenticate again. Make sure the browser is signed in to the CanHav account that owns this project.",
        },
        {
          q: "The agent says the project does not belong to you",
          a: "You are signed in with a different CanHav account. Sign out in the browser, then authenticate again with the right one.",
        },
        {
          q: "The write tools are missing",
          a: "Type /mcp, pick the server and reconnect. If they are still missing, restart Claude Code.",
        },
        {
          q: "The agent says writes are off",
          a: "Pick Propose changes or Write directly in the Write section of this guide.",
        },
        {
          q: "You renamed the project and want a matching server name",
          a: "Remove the old server with the command below, then add it again from this guide.",
        },
      ],
      remove: "Remove this server",
    },
  },
  removeCommand: (projectId: string, name: string) => `claude mcp remove ${mcpAlias(name, projectId)}`,
  reviewCommand: (projectId: string, name: string) =>
    `/mcp__${mcpAlias(name, projectId)}__prelaunch_review`,
  fillPrompt: (projectId: string, name: string) =>
    `Read this repository, then use the ${mcpAlias(name, projectId)} get_project tool to see the draft. Use update_project to fill in the architecture step from what the code actually does. Contracts, external dependencies, oracles, admin functions and upgradeability. Where nothing exists yet, say so plainly. Add a short note explaining each answer.`,
  stepsPrompt: (projectId: string, name: string) =>
    `Use the ${mcpAlias(name, projectId)} get_build_steps tool. For each step, check this repository for written evidence that it is done. Use set_build_steps to tick only the ones you can point to, and tell me which file proves each.`,
  tokenPrompt: (projectId: string, name: string) =>
    `Use the ${mcpAlias(name, projectId)} get_linked_token_design and get_design_constraints tools. Propose a supply, an allocation split that totals 100 and vesting for each cohort with update_linked_token_design, then run check_design and tell me the warnings.`,
} as const;

export const LAUNCH_COPY = {
  kicker: "Launchpad",
  title: "Launch a token",
  subtitleLead: "Create a token on Robinhood Chain Testnet in two steps.",
  subtitleDetail:
    "Name it, describe it, add an image and launch. Trading opens on a bonding curve in the same transaction, with an optional first buy for you, and the curve seeds a locked pool when it graduates. Any agent can read the launch over MCP.",
  previewTitle: "Your token",
  exploreTitle: "Recent launches",
  exploreLead:
    "Every token launched through CanHav, newest first. Open one to see its curve or pool, its commitment and sales, or read it from your agent.",
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
