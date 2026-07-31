import { createConfig } from "ponder";

import { TokenFactoryAbi } from "./abis/TokenFactoryAbi";

// Deployment record: contracts/broadcast/Deploy.s.sol/46630/run-latest.json
// Factory deployed at block 95600880 (2026-07-31).
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
      address: "0x1dAaa8294806d216Df36dc07B3803ED26584c909",
      startBlock: 95600880,
    },
  },
});
