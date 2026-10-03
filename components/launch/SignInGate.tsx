"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

interface GateProps {
  children: React.ReactNode;
  /**
   * Shown with the sign-in button to a signed-out visitor. Left out, the
   * gate renders nothing for them, for controls that are hidden until a
   * wallet connects anyway.
   */
  prompt?: string;
  /** The sign-in button label. */
  label?: string;
}

function Gate({ children, prompt, label = AUTH_COPY.logIn }: GateProps) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  if (!isLoaded) return null;
  if (isSignedIn) return <>{children}</>;
  if (prompt === undefined) return null;
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-ink-400">{prompt}</p>
      <Button asChild size="sm">
        <Link href={`${AUTH_COPY.signInPath}?redirect_url=${encodeURIComponent(pathname)}`}>{label}</Link>
      </Button>
    </div>
  );
}

/**
 * Write controls on the launch pages are for signed-in accounts. The pages
 * themselves stay public and session free, so the check runs in the browser.
 * It covers every path through the app. The contracts stay permissionless.
 */
export function SignInGate(props: GateProps) {
  // Config is fixed per build, so the hook component mounts consistently.
  if (!isAuthConfiguredClient()) return <>{props.children}</>;
  return <Gate {...props} />;
}
