import { type Address, encodeFunctionData, isAddress } from "viem";

/**
 * The team Safe (M160, F7): a Safe v1.4.1 multisig owned by the team
 * members' own wallets, deployed from the creator's connected wallet on
 * the project's testnet through the canonical SafeProxyFactory, or an
 * existing Safe recorded by address. CanHav holds no key: the owners and
 * threshold are read onchain and stored on the record as a verified fact.
 * The v1.4.1 contracts sit at the same canonical addresses on Robinhood
 * testnet 46630 and Arbitrum Sepolia 421614 (checked by eth_getCode on
 * 2026-10-24). Pure.
 */
export const SAFE_VERSION = "1.4.1";
export const SAFE_1_4_1 = {
  proxyFactory: "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67" as Address,
  singletonL2: "0x29fcB43b46531BcA003ddC8FCB67FFE91900C762" as Address,
  fallbackHandler: "0xfd0732Dc9E303f09fCEf3a7388Ad10A83459Ec99" as Address,
} as const;

export const SAFE_PROXY_FACTORY_ABI = [
  {
    type: "function",
    name: "createProxyWithNonce",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_singleton", type: "address" },
      { name: "initializer", type: "bytes" },
      { name: "saltNonce", type: "uint256" },
    ],
    outputs: [{ name: "proxy", type: "address" }],
  },
  {
    type: "event",
    name: "ProxyCreation",
    anonymous: false,
    inputs: [
      { name: "proxy", type: "address", indexed: true },
      { name: "singleton", type: "address", indexed: false },
    ],
  },
] as const;

export const SAFE_ABI = [
  {
    type: "function",
    name: "setup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_owners", type: "address[]" },
      { name: "_threshold", type: "uint256" },
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
      { name: "fallbackHandler", type: "address" },
      { name: "paymentToken", type: "address" },
      { name: "payment", type: "uint256" },
      { name: "paymentReceiver", type: "address" },
    ],
    outputs: [],
  },
  { type: "function", name: "getOwners", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", name: "getThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const TEAM_SAFE_LIMITS = { owners: { min: 1, max: 10 } } as const;

export interface TeamSafe {
  /** Lowercase hex. */
  address: string;
  /** Lowercase hex, as the Safe lists them. */
  owners: string[];
  threshold: number;
  chain: "robinhood_testnet" | "arbitrum_sepolia";
  /** ISO time the owners and threshold were read onchain. */
  verifiedAt: string;
}

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

/** The majority threshold, more than half of the owners. */
export function majorityOf(owners: number): number {
  return Math.max(1, Math.floor(owners / 2) + 1);
}

/** The Safe setup call the factory runs on the new proxy: the owners, the threshold, the fallback handler, no module, no payment. */
export function safeSetupData(owners: readonly Address[], threshold: number): `0x${string}` {
  return encodeFunctionData({
    abi: SAFE_ABI,
    functionName: "setup",
    args: [owners, BigInt(threshold), ZERO, "0x", SAFE_1_4_1.fallbackHandler, ZERO, 0n, ZERO],
  });
}

/** A salt the factory mixes into the proxy address; the time keeps a second deploy from colliding. */
export function safeSaltNonce(): bigint {
  return BigInt(Date.now());
}

export function isSafeAddress(v: unknown): v is string {
  return typeof v === "string" && isAddress(v);
}

/** The record as stored: lowercase addresses, a sane threshold, known chain; null when malformed. */
export function normalizeTeamSafe(raw: unknown): TeamSafe | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isSafeAddress(o.address)) return null;
  const owners = Array.isArray(o.owners) ? o.owners.filter(isSafeAddress).map((a) => a.toLowerCase()) : [];
  if (!owners.length || owners.length > TEAM_SAFE_LIMITS.owners.max) return null;
  const threshold = typeof o.threshold === "number" && Number.isInteger(o.threshold) && o.threshold >= 1 && o.threshold <= owners.length ? o.threshold : null;
  if (threshold === null) return null;
  const chain = o.chain === "robinhood_testnet" || o.chain === "arbitrum_sepolia" ? o.chain : null;
  if (!chain) return null;
  const verifiedAt = typeof o.verifiedAt === "string" && !Number.isNaN(Date.parse(o.verifiedAt)) ? o.verifiedAt : new Date().toISOString();
  return { address: o.address.toLowerCase(), owners, threshold, chain, verifiedAt };
}

/** "2 of 3" for a sentence. */
export function thresholdLabel(safe: Pick<TeamSafe, "owners" | "threshold">): string {
  return `${safe.threshold} of ${safe.owners.length}`;
}
