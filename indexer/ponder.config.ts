import { createConfig } from "ponder";

import { TokenFactoryAbi } from "./abis/TokenFactoryAbi";

// Deployment records: contracts/broadcast/{Deploy,DeployV2}.s.sol/46630/run-latest.json
// v1 factory (paused after v2 migration) deployed at block 95600880 (2026-07-31);
// v2 factory (vesting support) at block 95922560 (2026-08-01). Both watched with
// the v2 ABI — a superset; the v1 address simply never emits VestingCreated.
export default createConfig({
  chains: {
    robinhoodTestnet: {
      id: 46630,
      rpc: process.env.PONDER_RPC_URL_46630 ?? "https://rpc.testnet.chain.robinhood.com",
    },
  },
  contracts: {
    TokenFactory: {
      chain: "robinhoodTestnet",
      abi: TokenFactoryAbi,
      address: [
        "0x1dAaa8294806d216Df36dc07B3803ED26584c909",
        "0x10F33eE0f6a72D7Cc1f41196B4EF80B28C909Bc0",
      ],
      startBlock: 95600880,
    },
  },
});
