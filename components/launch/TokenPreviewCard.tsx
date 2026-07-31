import { Globe, ImageIcon } from "lucide-react";

import { LAUNCH_COPY, LAUNCH_FORM } from "@/content/launch";

/**
 * Live preview of the token being drafted. Pure props — parent owns state.
 * Uses a plain <img>: the preview is a blob: object URL, which next/image
 * cannot optimize or render.
 */
export function TokenPreviewCard({
  name,
  ticker,
  description,
  imageUrl,
  xHandle,
  website,
}: {
  name: string;
  ticker: string;
  description: string;
  imageUrl: string | null;
  xHandle: string;
  website: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();

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

      <div className="mt-5 space-y-2 border-t border-ink-800/70 pt-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-ink-500">Network</span>
          <span className="text-ink-200">Robinhood Chain testnet</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-500">Deployment</span>
          <span className="text-ink-200">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
