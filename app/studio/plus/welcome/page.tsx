import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ManageTeamButton } from "@/components/studio/PlusCheckout";
import { WelcomeMove } from "@/components/studio/WelcomeMove";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { getSessionUser } from "@/lib/auth";
import { getMyProjects } from "@/lib/ideation-db";
import { getPlan } from "@/lib/plan";

export const metadata: Metadata = {
  title: STUDIO_PLUS_COPY.name,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * After checkout (M108): confirms the plan, offers to move the account's
 * personal projects to the team in one go, and points at the Team page for
 * invitations.
 */
export default async function StudioPlusWelcome() {
  const W = STUDIO_PLUS_COPY.welcome;
  const user = await getSessionUser();
  if (!user) redirect("/studio/plus");
  const plan = await getPlan();
  const projects = ((await getMyProjects(user.owner)) ?? [])
    .filter((p) => p.owner_id === user.id && !p.org_id)
    .map((p) => ({ id: p.id, name: p.draft_doc.name }));
  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{W.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">{W.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">{W.lead}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {plan.plan === "studio_plus" ? (
            <StatusChip tone="success">{W.chip}</StatusChip>
          ) : (
            <StatusChip tone="info">{W.refresh}</StatusChip>
          )}
        </div>
      </div>
      <div className="mt-10 space-y-6">
        {plan.orgId || plan.forced ? <WelcomeMove projects={projects} /> : null}
        <Card className="max-w-2xl">
          <CardSection className="space-y-3">
            <h2 className="font-display text-base font-semibold text-ink-50">{W.invite}</h2>
            <p className="text-sm text-ink-300">{W.inviteLead}</p>
            <div className="flex flex-wrap items-center gap-3">
              <ManageTeamButton label={W.team} size="sm" />
              <Button asChild size="sm" variant="ghost">
                <Link href="/studio">{W.studio}</Link>
              </Button>
            </div>
          </CardSection>
        </Card>
      </div>
    </div>
  );
}
