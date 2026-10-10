import type { Metadata } from "next";

import { CONTACT_COPY } from "@/content/studio-pro";

export const metadata: Metadata = {
  title: "Book a discovery call",
  description: "Pick a time for a CanHav discovery call on Google Meet.",
};

/**
 * The booking page behind meet.canhav.com. The Google Calendar appointment
 * schedule is embedded as is, nothing designed around it. next.config.mjs
 * rewrites every path on the meet host here, and the contact modal links to
 * the host, so people never leave a canhav address to book.
 */
export default function MeetPage() {
  return (
    <div className="container py-6 md:py-8">
      <iframe
        src={CONTACT_COPY.bookingEmbedUrl}
        title={CONTACT_COPY.bookingCta}
        className="h-[calc(100svh-7rem)] min-h-[640px] w-full rounded-2xl border border-ink-700/60 bg-white"
        allow="payment"
      />
    </div>
  );
}
