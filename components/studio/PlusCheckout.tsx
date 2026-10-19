"use client";

import { PricingTable, useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/Button";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

/**
 * Clerk's pricing table for the active organization (M108). Checkout runs
 * inside it; the Continue button after payment lands on the welcome page.
 */
export function PlusCheckout() {
  return (
    <div>
      <PricingTable
        for="organization"
        newSubscriptionRedirectUrl="/studio/plus/welcome"
      />
      <p className="mt-4 text-xs text-ink-500">
        {STUDIO_PLUS_COPY.page.checkoutNote}
      </p>
    </div>
  );
}

/** Opens the organization profile, where members, seats and billing live. */
export function ManageTeamButton({
  label = STUDIO_PLUS_COPY.page.manage,
  variant = "secondary" as const,
  size = "md" as const,
}: {
  label?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md";
}) {
  const clerk = useClerk();
  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => clerk.openOrganizationProfile()}
    >
      {label}
    </Button>
  );
}
