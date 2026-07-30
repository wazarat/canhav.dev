import { BuiltForBuilders } from "@/components/home/BuiltForBuilders";
import { ContactCta } from "@/components/home/ContactCta";
import { HeroVideo } from "@/components/home/HeroVideo";
import { ProductLines } from "@/components/home/ProductLines";
import { WaitlistCta } from "@/components/home/WaitlistCta";
import { StatCard } from "@/components/ui/StatCard";
import { STATS } from "@/content/site";

export default function LandingPage() {
  return (
    <div>
      {/* Hero: full-bleed muted background video */}
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#3c72ab]">
        <HeroVideo src="/hero-video.mp4" />

        {/* scrims: darken top (for nav edge) + left (for hero copy) + fade into page bg */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,14,26,0.80) 0%, rgba(6,14,26,0.32) 20%, rgba(6,14,26,0) 40%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,14,26,0.74) 0%, rgba(6,14,26,0.42) 34%, rgba(6,14,26,0) 62%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-44"
          style={{
            background: "linear-gradient(180deg, rgba(5,6,10,0) 0%, #05060A 100%)",
          }}
        />

        <div className="container relative z-[2] flex min-h-[calc(100vh-4rem)] items-center py-16">
          <div className="max-w-2xl space-y-7 animate-fade-in-up">
            <h1
              className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink-50 md:text-6xl"
              style={{ textShadow: "0 2px 20px rgba(4,10,20,0.35)" }}
            >
              Where DeFi research gets{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg,#7cb0ff 0%,#b79bff 50%,#4fe3f5 100%)",
                }}
              >
                real context
              </span>
              , beyond on-chain data.
            </h1>
            <p
              className="max-w-xl text-lg leading-relaxed text-ink-50/90 md:text-xl"
              style={{ textShadow: "0 1px 12px rgba(4,10,20,0.4)" }}
            >
              Track what is happening on-chain, understand what is happening off-chain, and
              connect the dots across protocols, narratives, and external terminals from one
              place.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <WaitlistCta label="Join the waitlist" sourcePage="home-hero" withArrow />
              <ContactCta variant="secondary" sourcePage="home-hero" />
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-16 py-14 md:py-20">
        {/* Summary stats */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
          ))}
        </section>

        {/* Product-line showcase */}
        <ProductLines />

        <BuiltForBuilders />
      </div>
    </div>
  );
}
