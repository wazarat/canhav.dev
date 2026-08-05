import { createConfig } from "ponder";

import { IdentityRegistryAbi } from "./abis/IdentityRegistryAbi";

// ERC-8004 Identity Registry on Base Sepolia — a public singleton we don't
// own. The proxy deployed at block 36304145 (tx 0x35f77ccb…, 2026-01-14).
//
// The env override exists for future registry migrations only; the default is
// the canonical deployment. The prefix assert below is the line of defense
// against the testnet/mainnet vanity-address mixup (0x8004A818… testnet vs
// 0x8004A169… mainnet) — pointing at the wrong chain's registry would not
// error, it would just index nothing, silently, for weeks.
const IDENTITY_REGISTRY = (process.env.IDENTITY_REGISTRY_ADDRESS ??
  "0x8004A818BFB912233c491871b3d84c89A494BD9e") as `0x${string}`;

if (!IDENTITY_REGISTRY.startsWith("0x8004A818")) {
  throw new Error(
    `Refusing to start: ${IDENTITY_REGISTRY} is not the Base Sepolia Identity ` +
      `Registry (0x8004A818…). Mainnet is 0x8004A169… — testnet/mainnet mixup?`,
  );
}

export default createConfig({
  chains: {
    baseSepolia: {
      id: 84532,
      // The public endpoint rate-limits aggressively — fine for a wiring
      // proof, but set PONDER_RPC_URL_84532 (Alchemy or similar) for the
      // real historical sync and for Render.
      rpc: process.env.PONDER_RPC_URL_84532 ?? "https://sepolia.base.org",
    },
  },
  contracts: {
    // Impl ABI watched at the proxy address (ERC-1967) — events are emitted
    // through the proxy.
    IdentityRegistry: {
      chain: "baseSepolia",
      abi: IdentityRegistryAbi,
      address: IDENTITY_REGISTRY,
      startBlock: 36304145,
    },
  },
});
