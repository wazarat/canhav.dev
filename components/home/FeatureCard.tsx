import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Centered section header for the marketing feature pages (/tokens) and for
 * the closing section of /explore. Pass as="h2" when the page already has an
 * h1 above it, which /explore does.
 */
export function FeatureSectionHeader({
  kicker,
  title,
  lead,
  as: Heading = "h1",
}: {
  kicker: string;
  title: string;
  lead: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="text-center">
      <p className="kicker">{kicker}</p>
      <Heading className="mx-auto mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-50 md:text-5xl">
        {title}
      </Heading>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-300 md:text-lg">
        {lead}
      </p>
    </div>
  );
}

/**
 * Marketing feature card following the studio track card anatomy
 * (StudioTrackCards.tsx): icon tile header, tinted visual band with a
 * floating graphic panel and bottom fade, then title/description/footer.
 * Pass `href` + `ctaLabel` for a simple arrow link, or `action` for a
 * custom footer (e.g. a Button or ContactCta).
 */

const TINTS = {
  electric: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(61,123,255,0.22),transparent_62%)]",
  neon: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(139,92,246,0.14),transparent_62%)]",
  signal: "bg-[radial-gradient(120%_90%_at_50%_8%,rgba(34,211,238,0.12),transparent_62%)]",
} as const;

const ICON_TINTS = {
  electric: "text-electric-400",
  neon: "text-neon-400",
  signal: "text-signal-400",
} as const;

export function FeatureCard({
  icon: Icon,
  tint,
  graphic,
  title,
  description,
  href,
  ctaLabel,
  action,
  className,
}: {
  icon: LucideIcon;
  tint: keyof typeof TINTS;
  graphic: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const external = href?.startsWith("http");
  return (
    <div
      className={cn(
        "group glass flex flex-col overflow-hidden rounded-2xl border border-ink-700/60 transition-all duration-300",
        "hover:-translate-y-1 hover:border-electric-500/50 hover:shadow-[0_30px_70px_-34px_rgba(61,123,255,0.55)]",
        className,
      )}
    >
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/80">
          <Icon className={cn("h-4 w-4", ICON_TINTS[tint])} aria-hidden="true" />
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "relative h-[130px] overflow-hidden border-y border-ink-800/60 bg-ink-950/40",
          TINTS[tint],
        )}
      >
        <div className="mx-5 mt-5 rounded-t-xl border border-b-0 border-ink-700/70 bg-ink-950/90 p-3.5 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)]">
          {graphic}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/90" />
      </div>
      <div className="flex flex-1 flex-col space-y-2 p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-ink-50">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-ink-400">{description}</p>
        <div className="mt-auto pt-3">
          {action ??
            (href && ctaLabel && (
              <Link
                href={href}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-electric-400 transition-colors hover:text-electric-300"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
