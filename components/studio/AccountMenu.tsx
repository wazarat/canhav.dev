"use client";

import { User } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * The studio's account control (owner feedback 2026-10-13): one icon button
 * that opens a menu with Wallets (the Clerk profile, where a wallet is added
 * and proved by signature, M57) and Sign out. The email and the Wallets
 * label no longer sit in the header.
 */
function Inner() {
  const clerk = useClerk();
  return (
    <Menu
      width="w-44"
      trigger={({ open, toggle }) => (
        <Button
          variant="outline"
          size="sm"
          aria-label={AUTH_COPY.account}
          aria-expanded={open}
          title={AUTH_COPY.account}
          onClick={toggle}
          className="h-9 w-9 px-0"
        >
          <User aria-hidden className="h-4 w-4" />
        </Button>
      )}
    >
      <MenuItem onSelect={() => clerk.openUserProfile()}>{AUTH_COPY.wallets}</MenuItem>
      <MenuItem onSelect={() => void clerk.signOut({ redirectUrl: "/studio" })}>{AUTH_COPY.signOut}</MenuItem>
    </Menu>
  );
}

export function AccountMenu() {
  if (!isAuthConfiguredClient()) return null;
  return <Inner />;
}
