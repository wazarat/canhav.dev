"use client";

import { TOKEN_PAGE_COPY } from "@/content/launch";
import type { ProjectChain } from "@/lib/chains";

import { ConnectButton } from "./ConnectButton";

/** What the trade panel shows before a wallet is connected (M58). */
export function ConnectToTrade({ chain }: { chain: ProjectChain }) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-ink-400">{TOKEN_PAGE_COPY.trade.connect}</p>
      <ConnectButton chain={chain} />
    </div>
  );
}
