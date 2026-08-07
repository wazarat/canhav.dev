"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";

/**
 * The nav's auth slot: "Log In" when signed out, "Studio" when signed in.
 * Client-side Clerk state, so marketing pages stay statically rendered.
 * While Clerk loads (or when unconfigured) it shows the signed-out look.
 */
function LogInButton() {
  return (
    <Button asChild size="sm">
      <Link href="/studio">Log In</Link>
    </Button>
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
