"use client";

import { SignIn } from "@clerk/nextjs";

import { StatusChip } from "@/components/ui/StatusChip";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";

/**
 * Clerk sign-in, hash-routed so no catch-all route is needed. Clerk reads
 * ?redirect_url= from the page URL automatically — this powers the export
 * download round-trip. Email-first by design: no wallet anywhere in the
 * studio.
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
    </div>
  );
}
