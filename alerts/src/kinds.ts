/**
 * What the alerts worker watches (M123), shared with the app: the event
 * kinds a rule can name, the ABI events behind them, and how an event
 * reads in a message. Pure, no framework imports.
 */
import { type Log, decodeEventLog, formatEther, parseAbi } from "viem";

export const ALERT_KINDS = ["ownership", "pause", "large_transfer", "graduation"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const CHANNEL_KINDS = ["email", "telegram", "discord"] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const ALERT_LIMITS = {
  rulesPerProject: 10,
  channelsPerProject: 5,
  eventsShown: 10,
  /** Blocks per getLogs call, under the public RPC range caps. */
  blocksPerPoll: 2_000,
  pollMs: 60_000,
  rulesReloadMs: 300_000,
} as const;

/** The contract events behind the kinds, watched on every rule address. */
export const WATCHED_EVENTS = parseAbi([
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/** Graduation fires on the curve launcher, keyed by the token address. */
export const GRADUATED_EVENT = parseAbi(["event Graduated(address indexed token, uint256 indexed poolId, uint256 ethSeeded, uint256 tokensSeeded)"]);

export interface AlertRuleShape {
  id: string;
  chainId: number;
  address: string;
  label: string | null;
  kinds: AlertKind[];
  /** Wei as a decimal string; transfers at or above it alert. */
  thresholdWei: string | null;
}

export interface DecodedAlert {
  kind: AlertKind;
  /** One line, plain text, for every channel. */
  line: string;
  facts: Record<string, string>;
}

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Decode one log against a rule; null when the rule does not ask for it. */
export function decodeAlert(rule: AlertRuleShape, log: Pick<Log, "topics" | "data" | "address">, tokenLabel: string): DecodedAlert | null {
  const name = tokenLabel || short(rule.address);
  if (log.address.toLowerCase() === rule.address.toLowerCase()) {
    let decoded: ReturnType<typeof decodeEventLog<typeof WATCHED_EVENTS>>;
    try {
      decoded = decodeEventLog({ abi: WATCHED_EVENTS, topics: log.topics, data: log.data });
    } catch {
      return null;
    }
    if (decoded.eventName === "OwnershipTransferred" && rule.kinds.includes("ownership"))
      return { kind: "ownership", line: `${name} changed owner from ${short(decoded.args.previousOwner)} to ${short(decoded.args.newOwner)}.`, facts: { from: decoded.args.previousOwner, to: decoded.args.newOwner } };
    if (decoded.eventName === "Paused" && rule.kinds.includes("pause")) return { kind: "pause", line: `${name} was paused by ${short(decoded.args.account)}.`, facts: { by: decoded.args.account, state: "paused" } };
    if (decoded.eventName === "Unpaused" && rule.kinds.includes("pause")) return { kind: "pause", line: `${name} was unpaused by ${short(decoded.args.account)}.`, facts: { by: decoded.args.account, state: "unpaused" } };
    if (decoded.eventName === "Transfer" && rule.kinds.includes("large_transfer") && rule.thresholdWei && decoded.args.value >= BigInt(rule.thresholdWei))
      return { kind: "large_transfer", line: `${formatEther(decoded.args.value)} ${name} moved from ${short(decoded.args.from)} to ${short(decoded.args.to)}.`, facts: { from: decoded.args.from, to: decoded.args.to, value: decoded.args.value.toString() } };
    return null;
  }
  if (rule.kinds.includes("graduation")) {
    try {
      const g = decodeEventLog({ abi: GRADUATED_EVENT, topics: log.topics, data: log.data });
      if (g.args.token.toLowerCase() !== rule.address.toLowerCase()) return null;
      return { kind: "graduation", line: `${name} graduated from its curve with ${formatEther(g.args.ethSeeded)} ETH seeded into pool ${g.args.poolId}.`, facts: { poolId: g.args.poolId.toString(), ethSeeded: g.args.ethSeeded.toString() } };
    } catch {
      return null;
    }
  }
  return null;
}

/** The two testnets the worker polls; addresses from content/launch.ts, kept in step by hand. */
export const ALERT_CHAINS: ReadonlyArray<{ chainId: number; name: string; rpcUrl: string; explorerUrl: string; curveAddress: `0x${string}` }> = [
  { chainId: 46630, name: "Robinhood Chain Testnet", rpcUrl: "https://rpc.testnet.chain.robinhood.com", explorerUrl: "https://explorer.testnet.chain.robinhood.com", curveAddress: "0xb2e1F2df7775d17CE70c8CE7586c7bb01bD10981" },
  { chainId: 421614, name: "Arbitrum Sepolia", rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", explorerUrl: "https://arbitrum-sepolia.blockscout.com", curveAddress: "0x6Dde90B06b920565ccBA93D8ad7d5AfE5846426f" },
];

export function explorerTx(chainId: number, txHash: string): string {
  const chain = ALERT_CHAINS.find((c) => c.chainId === chainId);
  return chain ? `${chain.explorerUrl}/tx/${txHash}` : txHash;
}
