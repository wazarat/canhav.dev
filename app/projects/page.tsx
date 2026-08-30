import type { Metadata } from "next";
import Link from "next/link";

import { ContactCta } from "@/components/home/ContactCta";
import { FeatureCard, FeatureSectionHeader } from "@/components/home/FeatureCard";
import { Button } from "@/components/ui/Button";
import { Building2, Code2 } from "lucide-react";

export const metadata: Metadata = {
  description:
    "CanHav Research serves independent developers and enterprise teams building tokenization and agentic solutions.",
};

// The explore grid (components/explore/ProjectsGrid.tsx) returns here when
// the Projects track opens; the component is kept on disk for that relaunch.
export default function ProjectsPage() {
  return (
    <div className="container py-14 md:py-20">
      <FeatureSectionHeader
        kicker="Who we build for"
        title="Two ways to build with CanHav"
        lead="Whether you ship alone or with a team, the path to a credible launch starts here."
      />

      <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:mt-14 md:grid-cols-2">
        <FeatureCard
          icon={Code2}
          title="Independent Developers"
          description="Design, test, and validate your own token from end to end in the studio. Everything you publish becomes verifiable evidence."
          action={
            <Button asChild>
              <Link href="/studio">Sign up or log in</Link>
            </Button>
          }
        />
        <FeatureCard
          icon={Building2}
          title="Enterprise Solutions"
          description="Tokenization and agentic solutions scoped to your business. Talk to us about your use case and we will explore it with you."
          action={<ContactCta label="Contact us" sourcePage="projects-enterprise" />}
        />
      </div>
    </div>
  );
}
