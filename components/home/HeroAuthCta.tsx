"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * The hero's first button. Signed out it is "Sign up". Signed in the sign-up
 * button makes no sense, so the same slot opens the studio and the hero keeps
 * its two-button layout. Client-side Clerk state, like NavAuthButton, so the
 * landing page stays statically rendered. While Clerk loads (or when
 * unconfigured) it shows the signed-out look.
 */
function SignUpButton() {
  return (
    <Button asChild>
      <Link href={AUTH_COPY.signUpPath}>
        {AUTH_COPY.signUp}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function AuthAwareButton() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) return <SignUpButton />;
  return (
    <Button asChild>
      <Link href={AUTH_COPY.signInPath}>
        {AUTH_COPY.openStudio}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </Button>
  );
}

export function HeroAuthCta() {
  // Config is fixed per build, so the hook component mounts consistently.
  if (!isAuthConfiguredClient()) return <SignUpButton />;
  return <AuthAwareButton />;
}
