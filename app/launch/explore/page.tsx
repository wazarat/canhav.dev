import type { Metadata } from "next";
import Link from "next/link";

import { StatusChip } from "@/components/ui/StatusChip";
import { SECTOR_OPTIONS, STAGE_OPTIONS, optionLabel } from "@/content/ideation";
import { LAUNCH_CHAIN } from "@/content/launch";
import { formatCount } from "@/lib/format";
import { getPublishedProjects, getPublishedTokenDesigns } from "@/lib/ideation-db";
import { formatSupply, getActiveSaleTokens, getTokens } from "@/lib/indexer";
import { deriveTokenomics } from "@/lib/tokenDesign";
import { cn } from "@/lib/utils";

// Hidden like /launch: URL-only access, no nav links.
export const metadata: Metadata = {
  title: "Explore",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type View = "tokens" | "projects" | "designs";

const TABS: Array<{ view: View; label: string }> = [
  { view: "tokens", label: "Deployed tokens" },
  { view: "projects", label: "Projects" },
  { view: "designs", label: "Token designs" },
];

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-ink-700/70 p-8 text-center">
      <p className="text-sm text-ink-300">{children}</p>
    </div>
  );
}

async function TokensGrid() {
  const [tokens, liveSaleTokens] = await Promise.all([getTokens(), getActiveSaleTokens()]);
  if (tokens === null)
    return (
      <EmptyCard>
        Indexer offline. Start it with{" "}
        <code className="rounded bg-ink-900/80 px-1.5 py-0.5 font-mono text-xs text-ink-200">
          cd indexer && npm run dev
        </code>
      </EmptyCard>
    );
  if (tokens.length === 0) return <EmptyCard>No tokens launched yet.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((t) => (
        <Link
          key={t.address}
          href={`/launch/t/${t.address}`}
          className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/80">
              <span className="text-gradient-brand font-display text-lg font-semibold">
                {t.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold text-ink-50">{t.name}</p>
              <p className="font-mono text-xs text-electric-300">${t.symbol}</p>
            </div>
            {liveSaleTokens?.has(t.address.toLowerCase()) ? (
              <StatusChip tone="success" className="ml-auto shrink-0 px-2 py-0.5 text-[11px]">
                Live sale
              </StatusChip>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs">
            <span className="text-ink-500">Supply</span>
            <span className="tabular text-ink-200">{formatCount(formatSupply(t.totalSupply))}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-ink-500">Template</span>
            <span className="text-ink-200">v{t.version}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-ink-500">Block</span>
            <span className="tabular text-ink-200">{t.blockNumber}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function ProjectsGrid() {
  const projects = await getPublishedProjects();
  if (projects === null) return <EmptyCard>Storage offline.</EmptyCard>;
  if (projects.length === 0)
    return <EmptyCard>No published projects yet. A project needs no token to be here.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link
          key={p.id}
          href={`/p/${p.slug}`}
          className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
        >
          <p className="truncate font-display text-base font-semibold text-ink-50">
            {p.draft_doc.name}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-ink-400">{p.draft_doc.whatItDoes}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <StatusChip tone="neutral" className="px-2 py-0.5 text-[11px]">
              {p.draft_doc.sector === "other" && p.draft_doc.sectorOther
                ? p.draft_doc.sectorOther
                : optionLabel(SECTOR_OPTIONS, p.draft_doc.sector)}
            </StatusChip>
            <StatusChip tone="info" className="px-2 py-0.5 text-[11px]">
              {optionLabel(STAGE_OPTIONS, p.draft_doc.stage)}
            </StatusChip>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function DesignsGrid() {
  const designs = await getPublishedTokenDesigns();
  if (designs === null) return <EmptyCard>Storage offline.</EmptyCard>;
  if (designs.length === 0)
    return <EmptyCard>No published token designs yet.</EmptyCard>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {designs.map((t) => {
        const d = deriveTokenomics(t.draft_doc);
        return (
          <Link
            key={t.id}
            href={`/t/${t.slug}`}
            className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-display text-base font-semibold text-ink-50">
                {t.draft_doc.name}
              </p>
              <span className="shrink-0 font-mono text-xs text-electric-300">
                ${t.draft_doc.ticker}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-ink-500">Float at launch</span>
              <span className="tabular text-ink-200">
                {d.floatAtLaunchPct % 1 === 0
                  ? d.floatAtLaunchPct
                  : d.floatAtLaunchPct.toFixed(1)}
                %
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ink-500">Status</span>
              <span className="text-ink-200">
                {t.deployed_token_address ? "Deployed" : "Design only"}
              </span>
            </div>
            {d.warnings.length > 0 && (
              <div className="mt-3">
                <StatusChip tone="warning" className="px-2 py-0.5 text-[11px]">
                  {d.warnings.length} design warning{d.warnings.length > 1 ? "s" : ""}
                </StatusChip>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: rawView } = await searchParams;
  const view: View = rawView === "projects" || rawView === "designs" ? rawView : "tokens";

  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-2xl">
        <p className="kicker">Launchpad</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          Explore
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-300">
          Deployed tokens read from the on-chain event log on {LAUNCH_CHAIN.name} —
          alongside published projects and token designs, which need no
          deployment to be discoverable.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.view}
            href={tab.view === "tokens" ? "/launch/explore" : `/launch/explore?view=${tab.view}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              view === tab.view
                ? "border border-electric-500/50 bg-electric-500/20 text-electric-200"
                : "border border-ink-700/70 text-ink-400 hover:text-ink-200",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 md:mt-10">
        {view === "tokens" ? <TokensGrid /> : view === "projects" ? <ProjectsGrid /> : <DesignsGrid />}
      </div>
    </div>
  );
}
