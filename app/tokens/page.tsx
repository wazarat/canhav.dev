import type { Metadata } from "next";

import { FeatureCard, FeatureSectionHeader } from "@/components/home/FeatureCard";
import { SITE } from "@/content/site";
import { Cable, FlaskConical, Radar } from "lucide-react";

export const metadata: Metadata = {
  description:
    "Token design, testnet deployment, MCP connectors, and market validation through CanHav Research.",
};

/** Mini allocation meters, echoing the studio's token track graphic. */
function TestnetGraphic() {
  const rows = [
    { label: "Sale", pct: 45 },
    { label: "Liquidity", pct: 30 },
    { label: "Team", pct: 25 },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between font-mono text-[10px] text-ink-300">
            <span>{r.label}</span>
            <span className="tabular">{r.pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric-500 to-[#4FE3F5]"
              style={{ width: `${r.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Data flowing from CanHav into AI tools over MCP. */
function ConnectorGraphic() {
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      <g stroke="#8B5CF6" strokeOpacity="0.4" strokeDasharray="3 3">
        <line x1="52" y1="32" x2="148" y2="14" />
        <line x1="52" y1="32" x2="148" y2="32" />
        <line x1="52" y1="32" x2="148" y2="50" />
      </g>
      <rect x="16" y="20" width="36" height="24" rx="6" fill="#0A0C14" stroke="#8B5CF6" strokeOpacity="0.55" />
      <text x="34" y="36" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#B79BFF">
        ch.
      </text>
      <g fill="#0A0C14" stroke="#8B5CF6" strokeOpacity="0.5">
        <circle cx="152" cy="14" r="6" />
        <circle cx="152" cy="32" r="6" />
        <circle cx="152" cy="50" r="6" />
      </g>
      <g fill="#B79BFF" fillOpacity="0.8">
        <circle cx="152" cy="14" r="1.8" />
        <circle cx="152" cy="32" r="1.8" />
        <circle cx="152" cy="50" r="1.8" />
      </g>
    </svg>
  );
}

/** Feedback gathering before a market: rising signal with sample points. */
function ValidationGraphic() {
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      <polyline
        points="10,52 48,44 86,46 124,30 162,24 190,12"
        fill="none"
        stroke="#22D3EE"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g fill="#0A0C14" stroke="#22D3EE" strokeOpacity="0.6">
        <circle cx="48" cy="44" r="4" />
        <circle cx="124" cy="30" r="4" />
        <circle cx="190" cy="12" r="4" />
      </g>
      <line x1="6" y1="58" x2="194" y2="58" stroke="#7C8499" strokeOpacity="0.25" />
    </svg>
  );
}

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
          tint="electric"
          graphic={<TestnetGraphic />}
          title="Testnet Design"
          description="Design your token in the studio and deploy it to testnet in minutes. Supply, allocations, and vesting captured as a verifiable record."
          href="/studio"
          ctaLabel="Open the studio"
        />
        <FeatureCard
          icon={Cable}
          tint="neon"
          graphic={<ConnectorGraphic />}
          title="MCP Connectors"
          description="Bring CanHav data into your AI tools through MCP. Query tokens, designs, and market context from the agents you already work with."
          href={SITE.docsUrl}
          ctaLabel="Read the docs"
        />
        <FeatureCard
          icon={Radar}
          tint="signal"
          graphic={<ValidationGraphic />}
          title="Market Validation"
          description="Publish the evidence behind your launch and gather real market feedback before a market exists. Scrutiny first, speculation later."
          href="/studio"
          ctaLabel="Start validating"
        />
      </div>
    </div>
  );
}
