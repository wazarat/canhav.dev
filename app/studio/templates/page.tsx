import type { Metadata } from "next";
import { Suspense } from "react";

import { TemplateCard } from "@/components/ideation/kit/TemplateCard";
import { TemplateFilters, type TemplateQuery } from "@/components/studio/TemplateFilters";
import { StatusChip } from "@/components/ui/StatusChip";
import { TEMPLATE_CATALOG, TEMPLATE_CATALOG_GENERATED } from "@/content/templates";
import { TEMPLATE_COPY as T } from "@/content/templates/copy";
import { PROJECT_CHAINS, type ProjectChain, isProjectChain } from "@/lib/chains";
import { SECTOR_VALUES, SUBSECTOR_VALUES, type Sector, type Subsector, sectorOfSubsector } from "@/lib/sectors";
import {
  LICENSE_CLASSES,
  type LicenseClass,
  TEMPLATE_KINDS,
  type TemplateKind,
  templateOnChain,
  templatesForSubsectors,
} from "@/lib/templates";

// URL-only like /agents and /launch. Linked from the studio rail once a
// project has templates (M63), never from the nav.
export const metadata: Metadata = {
  title: "Contract templates",
  robots: { index: false, follow: false },
};

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function readQuery(sp: Params): TemplateQuery {
  const sector = first(sp.sector);
  const subsector = first(sp.subsector);
  const chain = first(sp.chain);
  const license = first(sp.license);
  const kind = first(sp.kind);
  return {
    q: first(sp.q).slice(0, 80),
    sector: (SECTOR_VALUES as readonly string[]).includes(sector) ? sector : "",
    subsector: (SUBSECTOR_VALUES as readonly string[]).includes(subsector) ? subsector : "",
    chain: isProjectChain(chain) ? chain : "",
    license: (LICENSE_CLASSES as readonly string[]).includes(license) ? license : "",
    kind: (TEMPLATE_KINDS as readonly string[]).includes(kind) ? kind : "",
    pons: first(sp.pons) === "1",
    inactive: first(sp.inactive) === "1",
  };
}

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const query = readQuery(await searchParams);
  const subs: Subsector[] = query.subsector
    ? [query.subsector as Subsector]
    : query.sector
      ? SUBSECTOR_VALUES.filter((s) => sectorOfSubsector(s) === (query.sector as Sector))
      : [...SUBSECTOR_VALUES];
  const chain: ProjectChain | null = isProjectChain(query.chain) ? query.chain : null;
  const needle = query.q.toLowerCase();
  const list = templatesForSubsectors(TEMPLATE_CATALOG, subs, chain ?? "robinhood_testnet", {
    kind: (query.kind || undefined) as TemplateKind | undefined,
    licenseClass: (query.license || undefined) as LicenseClass | undefined,
    pons: query.pons || undefined,
    includeInactive: query.inactive,
  })
    .filter((t) => !chain || templateOnChain(t, chain).status === "deployed")
    .filter(
      (t) =>
        !needle ||
        [t.name, t.provider, t.description, t.notes, t.license, t.id].some((f) => f.toLowerCase().includes(needle)),
    );
  const chains: readonly ProjectChain[] = chain ? [chain] : PROJECT_CHAINS;

  return (
    <div className="container py-14 md:py-20">
      <div className="max-w-3xl">
        <p className="kicker">{T.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">{T.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-200">{T.lede}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{T.generated(TEMPLATE_CATALOG_GENERATED)}</p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,17rem)_1fr]">
        <Suspense fallback={null}>
          <TemplateFilters query={query} />
        </Suspense>
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <StatusChip tone="neutral">{T.count(list.length)}</StatusChip>
          </div>
          {list.length === 0 ? (
            <StatusChip tone="neutral" variant="block">
              {T.none}
            </StatusChip>
          ) : (
            <div className="space-y-3">
              {list.map((t) => (
                <TemplateCard key={t.id} template={t} chains={chains} showSubsectors />
              ))}
            </div>
          )}
          <section className="mt-10 max-w-3xl space-y-2 text-sm leading-relaxed text-ink-400" aria-label={T.readingLabels}>
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-300">{T.readingLabels}</h2>
            {T.legend.map((line) => (
              <p key={line.slice(0, 24)}>{line}</p>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
