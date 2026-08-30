import type { Metadata } from "next";

import { FeatureCard, FeatureSectionHeader } from "@/components/home/FeatureCard";
import { SITE } from "@/content/site";
import { Cable, FlaskConical, Radar } from "lucide-react";

export const metadata: Metadata = {
  description:
    "Token design, testnet deployment, MCP connectors, and market validation through CanHav Research.",
};

// The explore grids (components/explore/TokensGrid.tsx, DesignsGrid.tsx) return
// here when the launch track reopens; both are kept on disk for that relaunch.
export default function TokensPage() {
  return (
    <div className="container py-14 md:py-20">
      <FeatureSectionHeader
        kicker="Launchpad"
        title="Everything a token needs before a market"
        lead="Design in the open, validate with evidence, and connect your launch data to the tools your team already uses."
      />

      <div className="mt-10 grid gap-5 md:mt-14 lg:grid-cols-3">
        <FeatureCard
          icon={FlaskConical}
          title="Testnet Design"
          description="Design your token in the studio and deploy it to testnet in minutes. Supply, allocations, and vesting captured as a verifiable record."
          href="/studio"
          ctaLabel="Open the studio"
        />
        <FeatureCard
          icon={Cable}
          title="MCP Connectors"
          description="Bring CanHav data into your AI tools through MCP. Query tokens, designs, and market context from the agents you already work with."
          href={SITE.docsUrl}
          ctaLabel="Read the docs"
        />
        <FeatureCard
          icon={Radar}
          title="Market Validation"
          description="Publish the evidence behind your launch and gather real market feedback before a market exists. Scrutiny first, speculation later."
          href="/studio"
          ctaLabel="Start validating"
        />
      </div>
    </div>
  );
}
