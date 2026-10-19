"use client";

import { Check, User } from "lucide-react";
import { useClerk, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { usePlan } from "@/components/studio/PlanContext";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { isAuthConfiguredClient } from "@/components/studio/authConfig";
import { AUTH_COPY } from "@/content/auth";

/**
 * The studio's account control (owner feedback 2026-10-13): one icon button
 * that opens a menu with Wallets (the Clerk profile, where a wallet is added
 * and proved by signature, M57), the teams the account belongs to with the
 * active one marked (M107, Clerk's switcher model as flat rows), Team for
 * the organization profile where members and billing live, Create a team,
 * and Sign out.
 */
function Inner() {
  const clerk = useClerk();
  const router = useRouter();
  const { orgId } = usePlan();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { infinite: false } });
  const teams = isLoaded ? userMemberships.data ?? [] : [];
  const pick = async (organization: string | null) => {
    await setActive?.({ organization });
    router.refresh();
  };
  const mark = (on: boolean) => (on ? <Check aria-hidden className="h-3.5 w-3.5 text-ink-50" /> : <span className="inline-block h-3.5 w-3.5" />);
  return (
    <Menu
      width="w-56"
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
      {teams.length > 0 ? (
        <>
          <MenuItem onSelect={() => void pick(null)}>
            <span className="flex items-center gap-2">
              {mark(!orgId)}
              {AUTH_COPY.personal}
            </span>
          </MenuItem>
          {teams.map((m) => (
            <MenuItem key={m.organization.id} onSelect={() => void pick(m.organization.id)}>
              <span className="flex items-center gap-2">
                {mark(orgId === m.organization.id)}
                <span className="truncate">{m.organization.name}</span>
              </span>
            </MenuItem>
          ))}
        </>
      ) : null}
      {orgId ? <MenuItem onSelect={() => clerk.openOrganizationProfile()}>{AUTH_COPY.team}</MenuItem> : null}
      <MenuItem onSelect={() => clerk.openCreateOrganization()}>{AUTH_COPY.createTeam}</MenuItem>
      <MenuItem onSelect={() => void clerk.signOut({ redirectUrl: "/studio" })}>{AUTH_COPY.signOut}</MenuItem>
    </Menu>
  );
}

export function AccountMenu() {
  if (!isAuthConfiguredClient()) return null;
  return <Inner />;
}
