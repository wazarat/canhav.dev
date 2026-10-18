import { cn } from "@/lib/utils";

/**
 * The studio track card body (M91, extracted from StudioTrackCards): a
 * tinted visual band with a floating panel for a small graphic and a bottom
 * fade, then the title, the description and a footer. The caller owns the
 * outer surface (a button, a link or a plain card) so the same shell serves
 * the track cards on the studio home and the sector cards in the new
 * project flow.
 */
export const TRACK_TINTS = {
  electric: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(61,123,255,0.22),transparent_62%)]",
  neon: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(139,92,246,0.14),transparent_62%)]",
  signal: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(34,211,238,0.12),transparent_62%)]",
} as const;

export type TrackTint = keyof typeof TRACK_TINTS;

/** The outer surface every track card shares. Add the accent hover and focus ring at the call site. */
export const trackCardSurface =
  "group glass w-full overflow-hidden rounded-xl border border-ink-700/60 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2";

export function TrackCardShell({
  tint,
  badge,
  graphic,
  title,
  description,
  footer,
  muted,
  compact,
}: {
  tint: TrackTint;
  /** Sits over the top right of the visual band. */
  badge?: React.ReactNode;
  graphic: React.ReactNode;
  title: string;
  description: string;
  footer?: React.ReactNode;
  muted?: boolean;
  /** A shorter band for a grid of many cards. */
  compact?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden border-b border-ink-800/60 bg-ink-950/40",
          compact ? "h-[96px]" : "h-[130px]",
          TRACK_TINTS[tint],
        )}
      >
        {badge && <div className="absolute right-4 top-4 z-10">{badge}</div>}
        <div
          className={cn(
            "mx-5 mt-5 rounded-t-xl border border-b-0 border-ink-700/70 bg-ink-950/90 p-3.5 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)]",
            muted && "opacity-60",
          )}
        >
          {graphic}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/90" />
      </div>
      <div className="space-y-2 p-5">
        <h3
          className={cn(
            "font-display font-semibold tracking-tight",
            compact ? "text-base" : "text-lg",
            muted ? "text-ink-200" : "text-ink-50",
          )}
        >
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-ink-400">{description}</p>
        {footer}
      </div>
    </>
  );
}
