import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Centered section header for the marketing feature pages (/tokens, /projects).
 */
export function FeatureSectionHeader({
  kicker,
  title,
  lead,
}: {
  kicker: string;
  title: string;
  lead: string;
}) {
  return (
    <div className="text-center">
      <p className="kicker">{kicker}</p>
      <h1 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-50 md:text-5xl">
        {title}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ink-300 md:text-lg">
        {lead}
      </p>
    </div>
  );
}

/**
 * Marketing feature card. Pass `href` + `ctaLabel` for a simple arrow link,
 * or `action` for a custom footer (e.g. a Button or ContactCta).
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  href,
  ctaLabel,
  action,
  className,
}: {
  icon: LucideIcon;
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
        "glass flex flex-col rounded-2xl border border-ink-700/60 p-6 transition-all duration-300",
        "hover:-translate-y-1 hover:border-electric-500/50 hover:shadow-[0_30px_70px_-34px_rgba(61,123,255,0.55)]",
        "md:rounded-3xl md:p-8",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/80">
        <Icon className="h-4 w-4 text-electric-400" aria-hidden="true" />
      </div>
      <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink-50">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">{description}</p>
      <div className="mt-auto pt-6">
        {action ??
          (href && ctaLabel && (
            <Link
              href={href}
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-electric-400 transition-colors hover:text-electric-300"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ))}
      </div>
    </div>
  );
}
