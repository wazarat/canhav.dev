"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * The nav's auth slot. Signed out it shows "Log in" (to /studio, where the
 * sign-in card lives) and "Sign up". On a phone only "Sign up" shows, the
 * sign-up page links to log in. Signed in it shows "Studio". Client-side
 * Clerk state, so marketing pages stay statically rendered. While Clerk loads
 * (or when unconfigured) it shows the signed-out look.
 */
function SignedOutButtons() {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
        <Link href={AUTH_COPY.signInPath}>{AUTH_COPY.logIn}</Link>
      </Button>
      <Button asChild size="sm">
        <Link href={AUTH_COPY.signUpPath}>{AUTH_COPY.signUp}</Link>
      </Button>
    </div>
  );
}

function AuthAwareButton() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) return <SignedOutButtons />;
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/studio">Studio</Link>
    </Button>
  );
}

export function NavAuthButton() {
  // Config is fixed per build, so the hook component mounts consistently.
  if (!isAuthConfiguredClient()) return <SignedOutButtons />;
  return <AuthAwareButton />;
}
