import type { Metadata } from "next";

import { LaunchForm } from "@/components/launch/LaunchForm";
import { LAUNCH_COPY } from "@/content/launch";

// Intentionally unlinked from navigation: URL-only access while the
// launchpad is developed incrementally.
export const metadata: Metadata = {
  title: LAUNCH_COPY.title,
  robots: { index: false, follow: false },
};

export default function LaunchPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{LAUNCH_COPY.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {LAUNCH_COPY.title}
        </h1>
        <p className="mt-4 text-lg font-medium leading-relaxed text-ink-100">
          {LAUNCH_COPY.subtitleLead}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">
          {LAUNCH_COPY.subtitleDetail}
        </p>
      </div>

      <div className="mt-10 md:mt-12">
        <LaunchForm />
      </div>
    </div>
  );
}
