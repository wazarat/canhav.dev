import { ExternalLink, Globe } from "lucide-react";

import { StatusChip } from "@/components/ui/StatusChip";
import { TOKEN_PAGE_COPY } from "@/content/launch";

import { CopyAddress } from "./CopyAddress";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border border-ink-700/70 bg-ink-900/60 px-3 py-1.5 text-xs text-ink-200 transition-colors hover:text-ink-50";

/**
 * The About card at the top of a token page (M58). What the token says it
 * is, who launched it, the fixed supply, and the ways out to the explorer
 * and its socials. The description shows only when it re-hashes to the
 * on-chain value.
 */
export function TokenAbout({
  address,
  creator,
  description,
  supply,
  symbol,
  networkName,
  explorerUrl,
  launchedOn,
  xHandle,
  telegram,
  website,
}: {
  address: string;
  creator: string;
  description: string | null;
  /** Whole tokens, already formatted. */
  supply: string;
  symbol: string;
  networkName: string;
  explorerUrl: string;
  launchedOn: string;
  xHandle: string;
  telegram: string | null;
  website: string;
}) {
  const C = TOKEN_PAGE_COPY.about;
  return (
    <div className="card-surface glow-ring mt-8 rounded-2xl border border-ink-700/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">{C.title}</h2>
        <StatusChip tone="neutral">{networkName}</StatusChip>
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0 max-w-2xl flex-1">
          <p className="text-sm leading-relaxed text-ink-100">{description ?? C.noDescription}</p>
          <p className="mt-2 text-xs text-ink-500">
            {C.creator}{" "}
            <a
              href={`${explorerUrl}/address/${creator}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-ink-300 transition-colors hover:text-electric-200"
            >
              {creator.slice(0, 6)}…{creator.slice(-4)}
            </a>{" "}
            · {C.launched} {launchedOn}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="sm:text-right">
            <p className="text-xs text-ink-500">{C.supply}</p>
            <p className="tabular mt-0.5 font-display text-2xl font-semibold text-ink-50">
              {supply} <span className="text-sm font-normal text-ink-400">{symbol}</span>
            </p>
            <p className="text-xs text-ink-500">{C.fixed}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyAddress address={address} />
            <a href={`${explorerUrl}/address/${address}`} target="_blank" rel="noreferrer" className={PILL}>
              <ExternalLink className="h-3.5 w-3.5" /> {C.explorer}
            </a>
            {xHandle ? (
              <a href={`https://x.com/${xHandle}`} target="_blank" rel="noreferrer" className={PILL}>
                {C.x}
              </a>
            ) : null}
            {telegram ? (
              <a href={`https://t.me/${telegram}`} target="_blank" rel="noreferrer" className={PILL}>
                {C.telegram}
              </a>
            ) : null}
            {website ? (
              <a href={website} target="_blank" rel="noreferrer" className={PILL}>
                <Globe className="h-3.5 w-3.5" /> {C.website}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
