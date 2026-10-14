import { ExternalLink } from "lucide-react";

import { StatusChip } from "@/components/ui/StatusChip";
import { TOKEN_PAGE_COPY } from "@/content/launch";
import type { MainnetPairView } from "@/lib/mainnet-view";

/**
 * The external trading pair the linked project recorded (M78), under the
 * Trade card's actions. Read-only: a pill naming the venue and the pair,
 * the trade link, and the one line that says the link leaves CanHav.
 */
export function ExternalPairRow({ pair, symbol }: { pair: MainnetPairView; symbol: string }) {
  const C = TOKEN_PAGE_COPY.trade.external;
  return (
    <div className="mt-4 border-t border-ink-800/70 pt-4">
      <p className="text-xs text-ink-500">{C.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusChip tone="info">
          {pair.venueLabel} · {symbol}/{pair.quoteAsset.startsWith("0x") ? `${pair.quoteAsset.slice(0, 6)}…` : pair.quoteAsset}
        </StatusChip>
        <a
          href={pair.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-electric-300 transition-colors hover:text-electric-200"
        >
          {C.link(pair.venueLabel)}
          <ExternalLink aria-hidden className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{C.note}</p>
    </div>
  );
}
