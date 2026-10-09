import type { Metadata } from "next";

import { ContactCta } from "@/components/home/ContactCta";
import { FeatureCard, FeatureSectionHeader } from "@/components/home/FeatureCard";
import { SITE } from "@/content/site";
import { STUDIO_PRO_COPY } from "@/content/studio-pro";
import {
  Braces,
  Cable,
  FlaskConical,
  Megaphone,
  PiggyBank,
  Radar,
  Rocket,
  Scale,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: STUDIO_PRO_COPY.metaTitle,
  description: STUDIO_PRO_COPY.metaDescription,
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

/** Launch data flowing from CanHav into the tools a team works in, over MCP. */
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

/** Compliance checklist, three items ticked off. */
function LegalGraphic() {
  const rows = ["Entity", "Terms", "KYC path"];
  return (
    <div className="space-y-2.5 py-0.5">
      {rows.map((label, i) => (
        <div key={label} className="flex items-center gap-2.5 font-mono text-[10px] text-ink-300">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
            <circle cx="8" cy="8" r="7" fill="#0A0C14" stroke="#3D7BFF" strokeOpacity={i < 2 ? 0.8 : 0.35} />
            {i < 2 && (
              <path d="M4.5 8.2 7 10.5 11.5 5.8" fill="none" stroke="#7CB0FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <span className={i < 2 ? "text-ink-200" : ""}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** A commit line with a feature branch merging back. */
function DevelopmentGraphic() {
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      <line x1="14" y1="44" x2="186" y2="44" stroke="#8B5CF6" strokeOpacity="0.45" strokeWidth="2" />
      <path d="M58 44 C 76 44, 76 18, 96 18 L 130 18 C 150 18, 150 44, 166 44" fill="none" stroke="#B79BFF" strokeOpacity="0.7" strokeWidth="2" />
      <g fill="#0A0C14" stroke="#8B5CF6" strokeOpacity="0.8">
        <circle cx="30" cy="44" r="4.5" />
        <circle cx="58" cy="44" r="4.5" />
        <circle cx="100" cy="18" r="4.5" />
        <circle cx="130" cy="18" r="4.5" />
        <circle cx="166" cy="44" r="4.5" />
      </g>
      <circle cx="166" cy="44" r="1.8" fill="#B79BFF" />
    </svg>
  );
}

/** A field of people, a few of them interviewed. */
function DiscoveryGraphic() {
  const cols = 10;
  const rows = 3;
  const picked = new Set([3, 11, 17, 24]);
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      {Array.from({ length: rows * cols }, (_, i) => {
        const cx = 18 + (i % cols) * 18.2;
        const cy = 14 + Math.floor(i / cols) * 18;
        const on = picked.has(i);
        return (
          <g key={i}>
            {on && <circle cx={cx} cy={cy} r="7" fill="none" stroke="#22D3EE" strokeOpacity="0.5" />}
            <circle cx={cx} cy={cy} r="3.2" fill={on ? "#22D3EE" : "#1E2433"} fillOpacity={on ? 0.9 : 1} />
          </g>
        );
      })}
    </svg>
  );
}

/** A post taking shape, cover image and copy lines. */
function ContentGraphic() {
  return (
    <div className="flex items-start gap-3 py-0.5">
      <div
        className="h-12 w-16 shrink-0 rounded-md border border-electric-500/40"
        style={{ background: "linear-gradient(135deg, rgba(61,123,255,0.35), rgba(79,227,245,0.15))" }}
      />
      <div className="flex-1 space-y-2 pt-1">
        <span className="block h-1.5 w-[85%] rounded-full bg-ink-200/70" />
        <span className="block h-1.5 w-[65%] rounded-full bg-ink-700/80" />
        <span className="block h-1.5 w-[75%] rounded-full bg-ink-700/80" />
        <span className="block h-1.5 w-[40%] rounded-full bg-ink-700/80" />
      </div>
    </div>
  );
}

/** Rounds stacking up, pre-seed to series A. */
function FundraisingGraphic() {
  const bars = [
    { label: "Angel", h: 18 },
    { label: "Pre seed", h: 30 },
    { label: "Seed", h: 44 },
  ];
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      {bars.map((b, i) => {
        const x = 30 + i * 56;
        return (
          <g key={b.label}>
            <rect x={x} y={50 - b.h} width="34" height={b.h} rx="3" fill="#8B5CF6" fillOpacity={0.25 + i * 0.2} stroke="#B79BFF" strokeOpacity="0.5" />
            <text x={x + 17} y="60" textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#7C8499">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** A launch timeline, three of five milestones done. */
function OperationsGraphic() {
  const ticks = [20, 60, 100, 140, 180];
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      <line x1="20" y1="32" x2="180" y2="32" stroke="#7C8499" strokeOpacity="0.3" strokeWidth="2" />
      <line x1="20" y1="32" x2="100" y2="32" stroke="#22D3EE" strokeOpacity="0.8" strokeWidth="2" />
      {ticks.map((x, i) => (
        <circle key={x} cx={x} cy="32" r={i === 2 ? 6 : 4} fill="#0A0C14" stroke="#22D3EE" strokeOpacity={i <= 2 ? 0.9 : 0.35} strokeWidth={i === 2 ? 2 : 1.5} />
      ))}
      <circle cx="100" cy="32" r="2.2" fill="#22D3EE" />
      <path d="M100 24 V 10 H 116 L 112 15 L 116 20 H 100" fill="#22D3EE" fillOpacity="0.85" />
    </svg>
  );
}

// The explore grids (components/explore/TokensGrid.tsx, DesignsGrid.tsx) return
// here when the launch track reopens; both are kept on disk for that relaunch.
// Was /tokens ("Everything a token needs before a market") until 2026-10-09.
export default function StudioProPage() {
  const copy = STUDIO_PRO_COPY;
  const serviceCards = [
    { key: "legal", icon: Scale, tint: "electric", graphic: <LegalGraphic /> },
    { key: "development", icon: Braces, tint: "neon", graphic: <DevelopmentGraphic /> },
    { key: "discovery", icon: Users, tint: "signal", graphic: <DiscoveryGraphic /> },
    { key: "content", icon: Megaphone, tint: "electric", graphic: <ContentGraphic /> },
    { key: "fundraising", icon: PiggyBank, tint: "neon", graphic: <FundraisingGraphic /> },
    { key: "operations", icon: Rocket, tint: "signal", graphic: <OperationsGraphic /> },
  ] as const;

  return (
    <div className="container py-14 md:py-20">
      <FeatureSectionHeader
        kicker={copy.kicker}
        title={
          <>
            <span className="block">{copy.titleLine1}</span>
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(120deg,#7cb0ff 0%,#b79bff 50%,#4fe3f5 100%)",
              }}
            >
              {copy.titleLine2}
            </span>
          </>
        }
        lead={
          <>
            <span className="font-semibold text-ink-50">{copy.leadFact}</span> {copy.lead}
          </>
        }
      />

      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <ContactCta label={copy.cta} size="lg" sourcePage="studiopro" />
        <p className="text-sm text-ink-400">{copy.ctaNote}</p>
      </div>

      <div className="mt-10 grid gap-5 md:mt-14 lg:grid-cols-3">
        <FeatureCard
          icon={FlaskConical}
          tint="electric"
          graphic={<TestnetGraphic />}
          title={copy.cards.testnet.title}
          description={copy.cards.testnet.description}
          href="/studio"
          ctaLabel={copy.cards.testnet.cta}
        />
        <FeatureCard
          icon={Cable}
          tint="neon"
          graphic={<ConnectorGraphic />}
          title={copy.cards.workflow.title}
          description={copy.cards.workflow.description}
          href={SITE.docsUrl}
          ctaLabel={copy.cards.workflow.cta}
        />
        <FeatureCard
          icon={Radar}
          tint="signal"
          graphic={<ValidationGraphic />}
          title={copy.cards.validation.title}
          description={copy.cards.validation.description}
          href="/studio"
          ctaLabel={copy.cards.validation.cta}
        />
      </div>

      {/* The six services. Same card anatomy, each one opens the contact form. */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {serviceCards.map((c) => (
          <FeatureCard
            key={c.key}
            icon={c.icon}
            tint={c.tint}
            graphic={c.graphic}
            title={copy.services[c.key].title}
            description={copy.services[c.key].description}
            action={
              <ContactCta
                label={copy.serviceCta}
                variant="ghost"
                size="sm"
                className="-ml-3.5 text-electric-400 hover:text-electric-300"
                sourcePage={`studiopro-${c.key}`}
              />
            }
          />
        ))}
      </div>
    </div>
  );
}
