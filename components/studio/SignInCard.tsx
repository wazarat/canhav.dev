"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * Clerk sign-in, hash-routed so no catch-all route is needed. Clerk reads
 * ?redirect_url= from the page URL automatically — this powers the export
 * download round-trip, and it still wins over the fallback below.
 * fallbackRedirectUrl keeps everyone else on /studio; Clerk's own default is
 * "/", and the nav has no Studio link until the session hydrates, so a
 * successful sign-in used to look like a failure. Email or wallet (M57): the
 * wallet buttons appear once Web3 sign-in is on in the Clerk dashboard.
 * Sign-up is open, at /sign-up.
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
      <SignIn routing="hash" signUpUrl={AUTH_COPY.signUpPath} fallbackRedirectUrl="/studio" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-400">{AUTH_COPY.noAccount}</span>
        <Button asChild variant="outline" size="sm">
          <Link href={AUTH_COPY.signUpPath}>{AUTH_COPY.signUp}</Link>
        </Button>
      </div>
    </div>
  );
}
