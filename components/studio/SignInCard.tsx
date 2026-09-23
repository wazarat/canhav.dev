"use client";

import { SignIn } from "@clerk/nextjs";

import { WaitlistCta } from "@/components/home/WaitlistCta";
import { StatusChip } from "@/components/ui/StatusChip";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { WAITLIST_COPY } from "@/content/waitlist";

/**
 * Clerk sign-in, hash-routed so no catch-all route is needed. Clerk reads
 * ?redirect_url= from the page URL automatically — this powers the export
 * download round-trip. Email-first by design: no wallet anywhere in the
 * studio. Accounts open in approved batches, so the card also offers the
 * waitlist to visitors without an invitation.
 */
export function SignInCard() {
  if (!isAuthConfiguredClient()) {
    return (
      <StatusChip tone="warning" variant="block">
        Sign-in is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and
        CLERK_SECRET_KEY.
      </StatusChip>
    );
  }
  return (
    <div className="max-w-md">
      <SignIn routing="hash" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-400">{WAITLIST_COPY.signInPrompt}</span>
        <WaitlistCta variant="outline" size="sm" sourcePage="sign-in" />
      </div>
    </div>
  );
}
