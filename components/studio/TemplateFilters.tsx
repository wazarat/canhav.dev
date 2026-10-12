"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, optionClasses } from "@/components/ui/Select";
import { SECTOR_OPTIONS, SUBSECTOR_OPTIONS_BY_SECTOR } from "@/content/ideation";
import { LICENSE_CLASS_LABELS, TEMPLATE_COPY as T, TEMPLATE_KIND_LABELS } from "@/content/templates/copy";
import { PROJECT_CHAINS, PROJECT_CHAIN_INFO } from "@/lib/chains";
import { SECTOR_VALUES } from "@/lib/sectors";
import { LICENSE_CLASSES, TEMPLATE_KINDS } from "@/lib/templates";

/**
 * The filter rail of /studio/templates (M61). Every filter is a search
 * param, so a filtered view is a link. Selects write on change, the search
 * box writes after a short pause.
 */
export interface TemplateQuery {
  q: string;
  sector: string;
  subsector: string;
  chain: string;
  license: string;
  kind: string;
  pons: boolean;
  inactive: boolean;
}

export function TemplateFilters({ query }: { query: TemplateQuery }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(query.q);

  const write = (patch: Partial<TemplateQuery>) => {
    const next = new URLSearchParams(params.toString());
    const set = (k: string, v: string | boolean | undefined) => {
      if (v === undefined) return;
      if (v === "" || v === false) next.delete(k);
      else next.set(k, v === true ? "1" : v);
    };
    for (const [k, v] of Object.entries(patch)) set(k, v);
    // A new sector drops a subsector that is not its own.
    if (patch.sector !== undefined) {
      const sub = next.get("subsector");
      const own = SUBSECTOR_OPTIONS_BY_SECTOR[patch.sector as (typeof SECTOR_VALUES)[number]] ?? [];
      if (sub && !own.some((o) => o.value === sub)) next.delete("subsector");
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (q === query.q) return;
    const id = setTimeout(() => write({ q: q.trim() }), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const subsectors = query.sector
    ? SUBSECTOR_OPTIONS_BY_SECTOR[query.sector as (typeof SECTOR_VALUES)[number]] ?? []
    : SECTOR_VALUES.flatMap((s) => SUBSECTOR_OPTIONS_BY_SECTOR[s] ?? []);
  const active =
    query.q || query.sector || query.subsector || query.chain || query.license || query.kind || query.pons || query.inactive;

  return (
    <aside className="space-y-4" aria-label={T.filters.title}>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{T.filters.search}</span>
        <Input type="search" value={q} placeholder={T.filters.searchPlaceholder} onChange={(e) => setQ(e.target.value)} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{T.filters.sector}</span>
        <Select value={query.sector} onChange={(e) => write({ sector: e.target.value })}>
          <option value="">Every sector</option>
          {SECTOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className={optionClasses}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{T.filters.subsector}</span>
        <Select value={query.subsector} onChange={(e) => write({ subsector: e.target.value })}>
          <option value="">Every subsector</option>
          {subsectors.map((o) => (
            <option key={o.value} value={o.value} className={optionClasses}>
              {o.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{T.filters.chain}</span>
        <Select value={query.chain} onChange={(e) => write({ chain: e.target.value })}>
          <option value="">{T.filters.anyChain}</option>
          {PROJECT_CHAINS.map((c) => (
            <option key={c} value={c} className={optionClasses}>
              {T.filters.liveOn(PROJECT_CHAIN_INFO[c].mainnetName)}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{T.filters.license}</span>
        <Select value={query.license} onChange={(e) => write({ license: e.target.value })}>
          <option value="">{T.filters.anyLicense}</option>
          {LICENSE_CLASSES.map((l) => (
            <option key={l} value={l} className={optionClasses}>
              {LICENSE_CLASS_LABELS[l]}
            </option>
          ))}
        </Select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{T.filters.kind}</span>
        <Select value={query.kind} onChange={(e) => write({ kind: e.target.value })}>
          <option value="">{T.filters.anyKind}</option>
          {TEMPLATE_KINDS.map((k) => (
            <option key={k} value={k} className={optionClasses}>
              {TEMPLATE_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={query.pons}
          onChange={(e) => write({ pons: e.target.checked })}
          className="h-4 w-4 rounded border-ink-700 bg-ink-950 accent-electric-500"
        />
        {T.filters.pons}
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-200">
        <input
          type="checkbox"
          checked={query.inactive}
          onChange={(e) => write({ inactive: e.target.checked })}
          className="h-4 w-4 rounded border-ink-700 bg-ink-950 accent-electric-500"
        />
        {T.filters.inactive}
      </label>
      {active ? (
        <Button size="sm" variant="ghost" onClick={() => router.replace(pathname, { scroll: false })}>
          {T.filters.clear}
        </Button>
      ) : null}
    </aside>
  );
}
