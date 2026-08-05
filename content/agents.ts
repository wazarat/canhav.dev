/**
 * Config for the hidden /agents page (ERC-8004 agent registration on Base
 * Sepolia). Like /launch, the page is intentionally unlinked from navigation —
 * URL-only access while the track is developed incrementally.
 *
 * Unlike content/launch.ts, the registry addresses are env-driven: we own no
 * contracts here — the ERC-8004 registries are public singletons — and the
 * testnet/mainnet deployments differ only in their vanity prefix
 * (0x8004A818… testnet vs 0x8004A169… mainnet), a mixup that fails silently.
 */

/** The testnet Identity Registry vanity prefix. Every layer (site banner,
 *  verify script, indexer startup) refuses addresses without it. */
export const TESTNET_REGISTRY_PREFIX = "0x8004A818";

export const AGENT_CHAIN = {
  name: "Base Sepolia",
  chainId: 84532,
  explorerUrl: "https://base-sepolia.blockscout.com",
  // ERC-8004 Identity Registry (ERC-1967 proxy; agents are ERC-721 tokens).
  identityRegistryAddress: (process.env.NEXT_PUBLIC_AGENTS_IDENTITY_REGISTRY ??
    "") as `0x${string}`,
  // Reputation Registry — read-only here: its getIdentityRegistry() is the
  // wiring cross-check for the address above. Otherwise out of scope.
  reputationRegistryAddress: (process.env.NEXT_PUBLIC_AGENTS_REPUTATION_REGISTRY ??
    "") as `0x${string}`,
} as const;

/**
 * Non-null when the config is unusable. Rendered as an error banner on the
 * page — never thrown: a module-scope throw would 500 the whole /agents
 * subtree, taking down the one page that could explain what's wrong.
 */
export const AGENT_CHAIN_ISSUE: string | null = !AGENT_CHAIN.identityRegistryAddress
  ? "NEXT_PUBLIC_AGENTS_IDENTITY_REGISTRY is not set — add it to the environment and redeploy."
  : !AGENT_CHAIN.identityRegistryAddress.startsWith(TESTNET_REGISTRY_PREFIX)
    ? `Identity registry ${AGENT_CHAIN.identityRegistryAddress} does not match the Base Sepolia deployment (${TESTNET_REGISTRY_PREFIX}…). The mainnet registry starts 0x8004A169 — testnet/mainnet mixup?`
    : null;

export const AGENTS_COPY = {
  kicker: "Agents",
  title: "Agent Registry",
  subtitleLead: "Register an AI agent on ERC-8004, on Base Sepolia testnet.",
  subtitleDetail:
    "Agents are ERC-721 identities on the public ERC-8004 Identity Registry. Registrations here will be limited to MCP endpoints — introspectable, so declared capabilities can be checked against reality.",
} as const;

/**
 * Wallets shown disabled in the picker, keyed by EIP-6963 rdns. Narrower than
 * the /launch list: Base Sepolia is a chain most wallets know natively, so
 * Keplr's "can't add custom EVM testnets" limitation doesn't apply here.
 */
export const AGENTS_UNSUPPORTED_WALLETS: Record<string, string> = {
  "app.hashpack": "HashPack is Hedera-only",
};
