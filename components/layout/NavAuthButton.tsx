"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { WaitlistCta } from "@/components/home/WaitlistCta";
import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { WAITLIST_COPY } from "@/content/waitlist";

/**
 * The nav's auth slot. Signed out it shows a quiet "Log in" link for approved
 * accounts plus the primary "Join waitlist" button (accounts open in approved
 * batches). Signed in it shows "Studio". Client-side Clerk state, so marketing
 * pages stay statically rendered. While Clerk loads (or when unconfigured) it
 * shows the signed-out look.
 */
function LogInButton() {
  return (
    <span className="flex items-center gap-3 sm:gap-4">
      <Link
        href="/studio"
        className="hidden whitespace-nowrap text-sm font-medium text-ink-300 transition-colors hover:text-ink-50 sm:inline"
      >
        {WAITLIST_COPY.navLogIn}
      </Link>
      <WaitlistCta
        size="sm"
        sourcePage="nav"
        label={
          <>
            <span className="sm:hidden">{WAITLIST_COPY.navButtonShort}</span>
            <span className="hidden sm:inline">{WAITLIST_COPY.navButton}</span>
          </>
        }
      />
    </span>
  );
}

function AuthAwareButton() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) return <LogInButton />;
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/studio">Studio</Link>
    </Button>
  );
}

export function NavAuthButton() {
  // Config is fixed per build, so the hook component mounts consistently.
  if (!isAuthConfiguredClient()) return <LogInButton />;
  return <AuthAwareButton />;
}
