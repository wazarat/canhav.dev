import Link from "next/link";
import { Building2, Code2 } from "lucide-react";

import { ContactCta } from "@/components/home/ContactCta";
import { FeatureCard, FeatureSectionHeader } from "@/components/home/FeatureCard";
import { Button } from "@/components/ui/Button";

/**
 * The two audience callouts that used to be the whole /projects page. They now
 * close the Explore page, under the launch board. Kept as one component so the
 * pair moves together if it is reused elsewhere.
 */

/** A build taking shape: indented code-like skeleton lines. */
function DeveloperGraphic() {
  const rows = [
    { indent: 0, width: "38%", tinted: true },
    { indent: 14, width: "58%", tinted: false },
    { indent: 14, width: "44%", tinted: false },
    { indent: 0, width: "26%", tinted: true },
  ];
  return (
    <div className="space-y-2.5 py-0.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center" style={{ paddingLeft: r.indent }}>
          <span
            className={r.tinted ? "h-1.5 rounded-full bg-electric-500/50" : "h-1.5 rounded-full bg-ink-700/70"}
            style={{ width: r.width }}
          />
        </div>
      ))}
    </div>
  );
}

/** A scoped engagement: checklist rows coming together. */
function EnterpriseGraphic() {
  const rows = [
    { width: "70%", tinted: true },
    { width: "52%", tinted: false },
    { width: "62%", tinted: false },
  ];
  return (
    <div className="space-y-3 py-0.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span
            className={
              r.tinted
                ? "h-3.5 w-3.5 shrink-0 rounded-full border border-neon-400/60 bg-neon-400/20"
                : "h-3.5 w-3.5 shrink-0 rounded-full border border-ink-700 bg-ink-900"
            }
          />
          <span
            className={r.tinted ? "h-1.5 rounded-full bg-neon-400/40" : "h-1.5 rounded-full bg-ink-700/70"}
            style={{ width: r.width }}
          />
        </div>
      ))}
    </div>
  );
}

export function BuildWithUsCards({ sourcePage = "explore-enterprise" }: { sourcePage?: string }) {
  return (
    <div>
      <FeatureSectionHeader
        as="h2"
        kicker="Who we build for"
        title="Two ways to build with CanHav"
        lead="Whether you ship alone or with a team, the path to a credible launch starts here."
      />

      <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:mt-14 md:grid-cols-2">
        <FeatureCard
          icon={Code2}
          tint="electric"
          graphic={<DeveloperGraphic />}
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
          tint="neon"
          graphic={<EnterpriseGraphic />}
          title="Enterprise Solutions"
          description="Tokenization and agentic solutions scoped to your business. Talk to us about your use case and we will explore it with you."
          action={<ContactCta label="Contact us" sourcePage={sourcePage} />}
        />
      </div>
    </div>
  );
}
