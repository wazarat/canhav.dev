import type { Metadata } from "next";
import Link from "next/link";

import {
  PlusCheckout,
  ManageTeamButton,
} from "@/components/studio/PlusCheckout";
import { PlusCreateTeam } from "@/components/studio/PlusCreateTeam";
import { SignInCard } from "@/components/studio/SignInCard";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { SoonBadge } from "@/components/ui/SoonBadge";
import { STUDIO_PLUS_COPY, STUDIO_PLUS_SHIPPED } from "@/content/studio-plus";
import { HELP_COPY, PERKS, PERKS_COPY } from "@/content/perks";
import { CONTACT_COPY } from "@/content/studio-pro";
import { ContactCta } from "@/components/home/ContactCta";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import { getPlan } from "@/lib/plan";
import { PLUS_FEATURES, type PlusFeature } from "@/lib/plan-shared";

export const metadata: Metadata = {
  title: STUDIO_PLUS_COPY.name,
  description: STUDIO_PLUS_COPY.page.lead,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FIRST_WAVE: readonly PlusFeature[] = [
  "bmc",
  "icp",
  "competitors",
  "brand",
];

function FeatureRows({ keys }: { keys: readonly PlusFeature[] }) {
  return (
    <Card>
      {keys.map((k) => {
        const F = STUDIO_PLUS_COPY.features[k];
        const shipped = STUDIO_PLUS_SHIPPED.includes(k);
        return (
          <CardSection
            key={k}
            className="flex flex-wrap items-start justify-between gap-3"
          >
            <div className="min-w-0 max-w-xl">
              <h3 className="font-display text-sm font-semibold text-ink-50">
                {F.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">
                {F.teaser}
              </p>
            </div>
            {shipped ? null : <SoonBadge label="Soon" accent="neon" />}
          </CardSection>
        );
      })}
    </Card>
  );
}

/**
 * The Studio+ page (M108): the offer, the two prices and the seat rule,
 * every feature, and the checkout for the session's team. Signed out it
 * asks for a sign in; without a team it offers to make one; on the plan
 * it says so and opens the Team page.
 */
export default async function StudioPlusPage() {
  const P = STUDIO_PLUS_COPY.page;
  const user = isAuthConfigured() ? await getSessionUser() : null;
  const plan = await getPlan();
  const more = PLUS_FEATURES.filter((f) => !FIRST_WAVE.includes(f));

  let action: React.ReactNode;
  if (!isAuthConfigured()) {
    action = (
      <p className="text-sm text-ink-300">
        Sign-in is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and
        CLERK_SECRET_KEY, then reload.
      </p>
    );
  } else if (!user) {
    action = (
      <div className="space-y-4">
        <p className="text-sm text-ink-300">{P.signIn}</p>
        <SignInCard redirectTo="/studio/plus" />
      </div>
    );
  } else if (plan.plan === "studio_plus") {
    action = (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-200">{P.onPlan}</span>
        <ManageTeamButton size="sm" />
        <Button asChild size="sm" variant="ghost">
          <Link href="/studio">{P.toStudio}</Link>
        </Button>
      </div>
    );
  } else if (!plan.orgId) {
    action = (
      <div className="space-y-2">
        <p className="text-sm text-ink-300">{P.noTeam}</p>
        <PlusCreateTeam />
      </div>
    );
  } else {
    action = <PlusCheckout />;
  }

  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">{P.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {P.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-400">{P.lead}</p>
      </div>

      {/* The plans first (owner feedback, 2026-10-19): Clerk's table is the one price card, checkout opens over the page. */}
      <section className="mt-10 max-w-3xl">
        <h2 className="font-display text-lg font-semibold text-ink-50">
          {P.plans}
        </h2>
        <div className="mt-3">{action}</div>
      </section>

      <div className="mt-12 max-w-3xl space-y-8">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-50">
            {P.firstWave}
          </h2>
          <div className="mt-3">
            <FeatureRows keys={FIRST_WAVE} />
          </div>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-50">
            {P.moreWave}
          </h2>
          <div className="mt-3">
            <FeatureRows keys={more} />
          </div>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-50">
            {PERKS_COPY.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            {PERKS_COPY.lead}
          </p>
          <div className="mt-3">
            <Card>
              {PERKS.map((perk) => (
                <CardSection
                  key={perk.partner}
                  className="flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="min-w-0 max-w-xl">
                    <h3 className="font-display text-sm font-semibold text-ink-50">
                      {perk.partner}{" "}
                      <span className="font-normal text-ink-400">
                        · {perk.what}
                      </span>
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-300">
                      {perk.blurb}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      {perk.referralUrl
                        ? PERKS_COPY.agreed
                        : PERKS_COPY.pending}
                      {perk.code ? ` · ${PERKS_COPY.code(perk.code)}` : ""}
                    </p>
                  </div>
                  <a
                    href={perk.referralUrl ?? perk.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink-200 hover:underline"
                  >
                    {PERKS_COPY.open}
                  </a>
                </CardSection>
              ))}
            </Card>
            <div className="mt-3">
              <ContactCta
                label={PERKS_COPY.ask}
                sourcePage="studio-plus-perks"
              />
            </div>
          </div>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-ink-50">
            {HELP_COPY.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            {HELP_COPY.lead}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button asChild size="sm" variant="outline">
              <a
                href={CONTACT_COPY.bookingUrl}
                target="_blank"
                rel="noreferrer"
              >
                {HELP_COPY.book}
              </a>
            </Button>
            <span className="text-xs text-ink-500">{HELP_COPY.reply}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
