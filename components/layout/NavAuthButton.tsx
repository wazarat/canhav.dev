"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * The nav's auth slot. Signed out it shows one "Log in or sign up" button to
 * /studio, where the sign-in card lives and links on to sign-up (M40). On a
 * phone the same button reads "Log in" so the four nav links still fit.
 * Signed in it shows "Studio". Client-side Clerk state, so marketing pages
 * stay statically rendered. While Clerk loads (or when unconfigured) it
 * shows the signed-out look.
 */
function SignedOutButtons() {
  return (
    <Button asChild size="sm">
      <Link href={AUTH_COPY.signInPath}>
        <span className="sm:hidden">{AUTH_COPY.logIn}</span>
        <span className="hidden sm:inline">{AUTH_COPY.logInOrSignUp}</span>
      </Link>
    </Button>
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
