import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

import { arbitrumSepolia, robinhoodTestnet } from "@/lib/chain";

export { arbitrumSepolia, robinhoodTestnet };

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [robinhoodTestnet.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
});
