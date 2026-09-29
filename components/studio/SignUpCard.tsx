"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * Clerk sign-up, hash-routed like SignInCard so no catch-all route is
 * needed. Sign-up is open to everyone. An invitation link (?__clerk_ticket=)
 * lands here too and the component picks the ticket up from the URL.
 */
export function SignUpCard() {
  if (!isAuthConfiguredClient()) {
    return (
      <StatusChip tone="warning" variant="block">
        Sign-up is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and
        CLERK_SECRET_KEY.
      </StatusChip>
    );
  }
  return (
    <div className="max-w-md">
      <SignUp routing="hash" signInUrl={AUTH_COPY.signInPath} fallbackRedirectUrl="/studio" />
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-400">{AUTH_COPY.haveAccount}</span>
        <Button asChild variant="outline" size="sm">
          <Link href={AUTH_COPY.signInPath}>{AUTH_COPY.logIn}</Link>
        </Button>
      </div>
    </div>
  );
}
