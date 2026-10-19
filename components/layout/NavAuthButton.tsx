"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { AccountMenu } from "@/components/studio/AccountMenu";
import { usePlan } from "@/components/studio/PlanContext";
import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { isStudioPath } from "@/lib/studio-entity";

/**
 * The nav's auth slot. Signed out it shows one "Log in or sign up" button to
 * /studio, where the sign-in card lives and links on to sign-up (M40). On a
 * phone the same button reads "Log in" so the nav links still fit.
 * Signed in it shows the plan word, Studio or Studio+ (M106), and on a
 * studio route only the account menu, since the breadcrumb at the left
 * names the open record (M92, moved left 2026-10-18). Client-side Clerk
 * state, so marketing pages stay statically rendered. While Clerk loads
 * (or when unconfigured) it shows the signed-out look.
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
  const pathname = usePathname();
  const { plan } = usePlan();
  if (!isLoaded || !isSignedIn) return <SignedOutButtons />;
  if (isStudioPath(pathname)) return <AccountMenu />;
  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/studio">{STUDIO_PLUS_COPY.planName(plan)}</Link>
    </Button>
  );
}

export function NavAuthButton() {
  // Config is fixed per build, so the hook component mounts consistently.
  if (!isAuthConfiguredClient()) return <SignedOutButtons />;
  return <AuthAwareButton />;
}
