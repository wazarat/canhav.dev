"use client";

import { SignOutButton as ClerkSignOutButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";

export function SignOutButton() {
  if (!isAuthConfiguredClient()) return null;
  return (
    <ClerkSignOutButton redirectUrl="/studio">
      <Button variant="ghost" size="sm">
        Sign out
      </Button>
    </ClerkSignOutButton>
  );
}
