"use client";

import { CreateOrganization } from "@clerk/nextjs";

/** Clerk's create organization form, landing back on the pricing page (M108). */
export function PlusCreateTeam() {
  return (
    <div className="mt-6">
      <CreateOrganization afterCreateOrganizationUrl="/studio/plus" skipInvitationScreen />
    </div>
  );
}
