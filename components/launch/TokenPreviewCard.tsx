import type { ReactNode } from "react";

import { Globe, ImageIcon } from "lucide-react";
import { formatEther } from "viem";

import { LAUNCH_COPY, LAUNCH_DEV_BUY, LAUNCH_FORM, LAUNCH_PARAMS } from "@/content/launch";

/**
 * Live preview of the token being drafted, plus the launch parameters that
 * apply to every launch. Pure props — parent owns state, and the launch fee is
 * read once by the form rather than twice.
 *
 * Uses a plain <img>: the preview is a blob: object URL, which next/image
 * cannot optimize or render.
 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="text-right text-ink-200">{children}</span>
    </div>
  );
}

function feeValue(launchFeeWei: bigint | undefined) {
  if (launchFeeWei === undefined) return LAUNCH_PARAMS.feeLoading;
  if (launchFeeWei === 0n) return LAUNCH_PARAMS.feeFree;
  return `${formatEther(launchFeeWei)} ETH`;
}

export function TokenPreviewCard({
  name,
  ticker,
  description,
  imageUrl,
  xHandle,
  telegram,
  website,
  totalSupply,
  launchFeeWei,
  devBuyWei,
  openingPrice,
}: {
  name: string;
  ticker: string;
  description: string;
  imageUrl: string | null;
  xHandle: string;
  telegram: string;
  website: string;
  totalSupply: number;
  launchFeeWei: bigint | undefined;
  /** 0n when the field is empty or invalid. */
  devBuyWei: bigint;
  /** Preformatted ETH per token, null when there is no developer buy. */
  openingPrice: string | null;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  const L = LAUNCH_PARAMS.labels;
  const hasDevBuy = devBuyWei > 0n;

  return (
    <div className="card-surface glow-ring rounded-2xl border border-ink-700/70 p-6">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900/80">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Token" className="h-full w-full object-cover" />
        ) : initial ? (
          <span className="text-gradient-brand font-display text-2xl font-semibold">
            {initial}
          </span>
        ) : (
          <ImageIcon className="h-6 w-6 text-ink-600" />
        )}
      </div>

      <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink-50">
        {name.trim() || LAUNCH_COPY.previewTitle}
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-electric-500/40 bg-electric-500/10 px-2.5 py-0.5 font-mono text-xs text-electric-300">
          ${ticker || "TICKER"}
        </span>
        {xHandle ? (
          <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300">
            {LAUNCH_FORM.xHandle.prefix}
            {xHandle}
          </span>
        ) : null}
        {telegram ? (
          <span className="inline-flex items-center rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300">
            {LAUNCH_FORM.telegram.prefix}
            {telegram}
          </span>
        ) : null}
        {website ? (
          <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-ink-700/70 bg-ink-900/60 px-2.5 py-0.5 text-xs text-ink-300">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{website.replace(/^https?:\/\//, "")}</span>
          </span>
        ) : null}
      </div>

      {description.trim() ? (
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-300">
          {description}
        </p>
      ) : (
        <p className="mt-3 text-sm text-ink-600">A short description of the token.</p>
      )}

      <div className="mt-5 space-y-2.5 border-t border-ink-800/70 pt-4 text-xs">
        <Row label={L.totalSupply}>
          <span className="tabular">{totalSupply.toLocaleString("en-US")}</span>
        </Row>
        <Row label={L.launchFee}>
          <span className="tabular">{feeValue(launchFeeWei)}</span>
        </Row>
        <Row label={L.devBuy}>
          <span className="tabular">
            {hasDevBuy ? `${formatEther(devBuyWei)} ETH` : LAUNCH_DEV_BUY.none}
          </span>
        </Row>
        <Row label={L.pairedWith}>{LAUNCH_PARAMS.pairedWith}</Row>
        <Row label={L.tradeFee}>
          <span className="tabular">{LAUNCH_PARAMS.tradeFee}</span>
        </Row>
        <Row label={L.launchWindow}>{LAUNCH_PARAMS.launchWindow}</Row>
        <Row label={L.graduation}>{LAUNCH_PARAMS.graduation}</Row>
        <Row label={L.liquidity}>
          {hasDevBuy ? LAUNCH_PARAMS.liquidity : LAUNCH_PARAMS.liquidityNone}
        </Row>
        {hasDevBuy && openingPrice ? (
          <Row label={L.openingPrice}>
            <span className="tabular">
              {openingPrice} ETH per {ticker || "token"}
            </span>
          </Row>
        ) : null}
      </div>
    </div>
  );
}
