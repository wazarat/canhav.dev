import type { Metadata } from "next";

import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WAITLIST_COPY } from "@/content/waitlist";

export const metadata: Metadata = {
  title: WAITLIST_COPY.title,
  description: WAITLIST_COPY.lead,
};

/** The same form as the waitlist modal, on its own page. */
export default function WaitlistPage() {
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{WAITLIST_COPY.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {WAITLIST_COPY.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">{WAITLIST_COPY.lead}</p>
      </div>

      <div className="glass mt-10 max-w-xl rounded-2xl border border-ink-700/70 p-6 md:mt-12 md:p-7">
        <WaitlistForm sourcePage="waitlist-page" />
      </div>
    </div>
  );
}
