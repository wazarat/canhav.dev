/**
 * Config and validators for the hidden /launch page (testnet token launchpad).
 * The page is intentionally unlinked from navigation — URL-only access while
 * the launchpad is developed incrementally. Nothing here touches a network.
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

export const LAUNCH_COPY = {
  kicker: "Launchpad",
  title: "Ideate Token Launch",
  subtitleLead: "Create a test token on Robinhood Chain testnet.",
  subtitleDetail:
    "Fill in the details, write the journey, and launch. The journey's hash will build credibility as it is committed on-chain with the token.",
  previewTitle: "Your token",
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
