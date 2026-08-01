import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

import { robinhoodTestnet } from "@/lib/chain";

export { robinhoodTestnet };

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet],
  connectors: [injected()],
  transports: {
    [robinhoodTestnet.id]: http(),
  },
});
