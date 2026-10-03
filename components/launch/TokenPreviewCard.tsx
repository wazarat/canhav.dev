import type { ReactNode } from "react";

import { ChevronDown, Clock, Globe, ImageIcon, Lock, ShieldCheck } from "lucide-react";
import { formatEther } from "viem";

import { StatusChip } from "@/components/ui/StatusChip";
import { LAUNCH_COPY, LAUNCH_DEV_BUY, LAUNCH_FORM, LAUNCH_PARAMS } from "@/content/launch";
import type { ProjectContext } from "@/lib/ideation";

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
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-ink-100">{children}</span>
    </div>
  );
}

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-ink-500">{icon}</span>
      <p className="leading-relaxed text-ink-400">{children}</p>
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
  project = null,
  projectLabel,
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
  /** The studio project the launch was started from, when there is one. */
  project?: ProjectContext | null;
  /** The linked project's name, or the words for a new draft or for none. */
  projectLabel: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  const L = LAUNCH_PARAMS.labels;
  const S = LAUNCH_PARAMS.short;
  const projectChips = project
    ? [...project.sectorLabels, ...project.subsectorLabels, ...project.shapeLabels]
    : [];
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

      <div className="mt-5 border-t border-ink-800/70 pt-4">
        <p className="text-xs font-medium text-ink-300">{LAUNCH_PARAMS.summaryTitle}</p>
        <div className="mt-3 space-y-2.5 text-xs">
          <Row label={LAUNCH_PARAMS.project.label}>{projectLabel}</Row>
          {projectChips.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {projectChips.map((label) => (
                <StatusChip key={label} tone="neutral" className="px-2 py-0.5 text-[11px]">
                  {label}
                </StatusChip>
              ))}
            </div>
          ) : null}
          <Row label={L.totalSupply}>
            <span className="tabular">{totalSupply.toLocaleString("en-US")}</span>
          </Row>
          <Row label={L.curveShare}>
            <span className="tabular">{S.curveShare}</span>
          </Row>
          <Row label={L.pairedWith}>{LAUNCH_PARAMS.pairedWith}</Row>
          <Row label={L.launchFee}>
            <span className="tabular">{feeValue(launchFeeWei)}</span>
          </Row>
          <Row label={L.devBuy}>
            <span className="tabular">
              {hasDevBuy ? `${formatEther(devBuyWei)} ETH` : LAUNCH_DEV_BUY.none}
            </span>
          </Row>
          {hasDevBuy && openingPrice ? (
            <Row label={L.openingPrice}>
              <span className="tabular">{openingPrice} ETH</span>
            </Row>
          ) : null}
          <Row label={L.tradeFee}>
            <span className="tabular">{S.tradeFee}</span>
          </Row>
          <Row label={L.launchWindow}>
            <span className="tabular">{S.launchWindow}</span>
          </Row>
          <Row label={L.graduation}>
            <span className="tabular">{S.graduation}</span>
          </Row>
          <Row label={L.liquidity}>{S.liquidity}</Row>
        </div>
      </div>

      <details className="group mt-4 border-t border-ink-800/70 pt-3 text-[11px]">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-ink-400 transition-colors hover:text-ink-200 [&::-webkit-details-marker]:hidden">
          {LAUNCH_PARAMS.notesTitle}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2.5">
          <Note icon={<Lock className="h-3.5 w-3.5" />}>{LAUNCH_PARAMS.notes.liquidity}</Note>
          <Note icon={<Clock className="h-3.5 w-3.5" />}>{LAUNCH_PARAMS.notes.window}</Note>
          <Note icon={<ShieldCheck className="h-3.5 w-3.5" />}>{LAUNCH_PARAMS.notes.fixed}</Note>
        </div>
      </details>
    </div>
  );
}
