"use client";

import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * Opens the Clerk profile, where a wallet is added to the account and proved
 * by signature (M57). Launches from a verified wallet belong to the account.
 */
function Inner() {
  const clerk = useClerk();
  return (
    <Button variant="ghost" size="sm" title={AUTH_COPY.walletsHint} onClick={() => clerk.openUserProfile()}>
      {AUTH_COPY.wallets}
    </Button>
  );
}

export function WalletsButton() {
  if (!isAuthConfiguredClient()) return null;
  return <Inner />;
}
