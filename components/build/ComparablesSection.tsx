"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

import { Menu, MenuItem } from "@/components/ui/Menu";
import { Segmented } from "@/components/ui/Segmented";
import { subsectorLabel } from "@/content/ideation";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { TEMPLATE_BY_ID } from "@/content/templates";
import type { Comparable } from "@/lib/comparables";
import { COMPETITOR_LIMITS } from "@/lib/competitors/record";
import type { Icp } from "@/lib/icp";
import type { Subsector } from "@/lib/sectors";
import { cn } from "@/lib/utils";
import { PROFILE_KEYS, type ProfileKey, VALUE_MAP_AREAS, VALUE_REF_LIMITS, type ValueArea, type ValueCanvases, type ValueItem, type ValueRef } from "@/lib/value-canvas";

const C = STUDIO_PLUS_COPY.competitors.comparables;
const SHOW = 3;

/**
 * How others built it (M169, V5): one card per comparable of the
 * project's subsectors with the differentiator first, components
 * collapsed after three, "Unlike X, ..." contrasts when X is also shown,
 * risks grouped by category one line each, links to docs, GitHub and
 * the matching templates, a subsector filter when the project has more
 * than one, "Pin on the map" when the comparable is on the landscape,
 * and "Use as reference" on each component and risk line, which attaches
 * it to a value canvas item as its source. No dates, no metrics.
 */
export function ComparablesSection({
  projectId,
  pinned,
  pinnable,
  onPin,
  profiles,
  valueCanvas,
  onValueCanvas,
}: {
  projectId: string;
  pinned: ReadonlySet<string>;
  /** DefiLlama slugs on the landscape, the ones a pin can land on. */
  pinnable: ReadonlySet<string>;
  onPin: (slug: string) => void;
  profiles: Icp[] | undefined;
  valueCanvas: ValueCanvases | undefined;
  onValueCanvas: (next: ValueCanvases) => void;
}) {
  const [data, setData] = useState<{ subsectors: Subsector[]; comparables: Comparable[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Subsector | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [attached, setAttached] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/ideation/projects/${projectId}/comparables`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { subsectors: Subsector[]; comparables: Comparable[] }) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (failed) return <p className="text-xs text-rose-400">{C.failed}</p>;
  if (!data) return <p className="text-xs text-ink-500">{C.loading}</p>;
  const list = filter === "all" ? data.comparables : data.comparables.filter((c) => c.subsectors.includes(filter));
  const shown = new Set(list.map((c) => c.id));
  // The value canvas items a reference can land on, per profile.
  const targets = PROFILE_KEYS.flatMap((k) => {
    const c = valueCanvas?.[k];
    if (!c) return [];
    return VALUE_MAP_AREAS.flatMap((a) => c[a].map((item) => ({ key: k, area: a, item })));
  });
  const attach = (ref: ValueRef, key: ProfileKey, area: ValueArea, item: ValueItem) => {
    const canvas = valueCanvas?.[key];
    if (!canvas) return;
    const refs = item.refs ?? [];
    if (refs.length >= VALUE_REF_LIMITS.max || refs.some((r) => r.comparable === ref.comparable && r.section === ref.section && r.name === ref.name)) return;
    const next = { ...canvas, [area]: canvas[area].map((i) => (i.id === item.id ? { ...i, refs: [...refs, ref] } : i)) };
    onValueCanvas({ ...(valueCanvas ?? {}), [key]: next });
    setAttached(`${ref.comparable}:${ref.name}`);
  };
  const useAs = (c: Comparable, section: "components" | "risks", name: string) => (
    <Menu
      align="left"
      width="w-72"
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="text-[11px] text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline" title={C.useAsHint(c.name)}>
          {attached === `${c.id}:${name}` ? C.attached(targets.find((t) => t.item.refs?.some((r) => r.comparable === c.id && r.name === name))?.item.text ?? "") : C.useAs}
        </button>
      )}
    >
      {targets.length === 0 ? (
        <MenuItem disabled>{C.noItems}</MenuItem>
      ) : (
        targets.map((t) => (
          <MenuItem key={`${t.key}:${t.item.id}`} onSelect={() => attach({ comparable: c.id, section, name }, t.key, t.area, t.item)} disabled={(t.item.refs?.length ?? 0) >= VALUE_REF_LIMITS.max}>
            <span className="min-w-0">
              <span className="block truncate">{t.item.text}</span>
              <span className="block text-xs text-ink-500">
                {profiles?.[Number(t.key)]?.name?.trim() || C.profile(Number(t.key) + 1)}, {STUDIO_PLUS_COPY.valueCanvas.areas[t.area].label.toLowerCase()}
                {(t.item.refs?.length ?? 0) >= VALUE_REF_LIMITS.max ? `, ${C.refsFull.toLowerCase()}` : ""}
              </span>
            </span>
          </MenuItem>
        ))
      )}
    </Menu>
  );
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-display text-sm font-semibold text-ink-50">{C.title}</h3>
        <p className="text-xs leading-relaxed text-ink-400">{C.lead}</p>
      </div>
      {data.subsectors.length > 1 ? (
        <Segmented<Subsector | "all"> size="sm" ariaLabel={C.title} value={filter} onChange={setFilter} options={[{ value: "all", label: C.all }, ...data.subsectors.map((s) => ({ value: s, label: subsectorLabel(s) }))]} />
      ) : null}
      {list.length === 0 ? <p className="text-xs text-ink-500">{C.none}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((c) => {
          const open = expanded.has(c.id);
          const components = open ? c.components : c.components.slice(0, SHOW);
          const contrasts = c.contrasts.filter((x) => shown.has(x.slug) && (x.differences || x.positioning));
          const risks = new Map<string, string>();
          for (const r of c.risks) if (!risks.has(r.category)) risks.set(r.category, r.description);
          const canPin = pinnable.has(c.id);
          const isPinned = pinned.has(c.id);
          const templates = c.templateIds.map((id) => TEMPLATE_BY_ID.get(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
          return (
            <article key={c.id} className="space-y-3 rounded-lg border border-ink-700/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-medium text-ink-50">
                  {c.links.website ? (
                    <a href={c.links.website} target="_blank" rel="noreferrer" className="hover:underline">
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                </h4>
                {canPin ? (
                  isPinned ? (
                    <span className="shrink-0 text-[11px] text-ink-400">{C.pinned}</span>
                  ) : (
                    <button type="button" onClick={() => onPin(c.id)} disabled={pinned.size >= COMPETITOR_LIMITS.pinned.max} title={pinned.size >= COMPETITOR_LIMITS.pinned.max ? C.pinFull : undefined} className="shrink-0 text-[11px] text-ink-300 underline-offset-2 hover:text-ink-50 hover:underline disabled:text-ink-600 disabled:no-underline">
                      {C.pin}
                    </button>
                  )
                ) : (
                  <span className="shrink-0 text-[11px] text-ink-500">{C.notOnChain}</span>
                )}
              </div>
              {c.differentiator ? <p className="text-sm leading-relaxed text-ink-100">{c.differentiator}</p> : <p className="text-sm leading-relaxed text-ink-300">{c.description}</p>}
              {c.components.length ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{C.components}</p>
                  <ul className="space-y-1">
                    {components.map((x) => (
                      <li key={x.name} className="text-xs leading-relaxed text-ink-300">
                        <span className="text-ink-100">{x.name}.</span> {x.description} {useAs(c, "components", x.name)}
                      </li>
                    ))}
                  </ul>
                  {c.components.length > SHOW ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((s) => {
                          const n = new Set(s);
                          if (n.has(c.id)) n.delete(c.id);
                          else n.add(c.id);
                          return n;
                        })
                      }
                      className="text-[11px] text-ink-400 underline-offset-2 hover:text-ink-50 hover:underline"
                    >
                      {open ? C.less : C.more(c.components.length - SHOW)}
                    </button>
                  ) : null}
                </div>
              ) : null}
              {contrasts.length ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{C.contrasts}</p>
                  <ul className="space-y-1">
                    {contrasts.map((x) => (
                      <li key={x.slug} className="text-xs leading-relaxed text-ink-300">
                        {C.unlike(x.name, x.differences ?? x.positioning ?? "")}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {risks.size ? (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{C.risks}</p>
                  <ul className="space-y-1">
                    {[...risks.entries()].map(([category, description]) => (
                      <li key={category} className="text-xs leading-relaxed text-ink-300">
                        <span className="text-ink-100">{category}.</span> {description} {useAs(c, "risks", category)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className={cn("flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400")}>
                {c.links.docs ? (
                  <a href={c.links.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink-50 hover:underline">
                    {C.links.docs} <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                ) : null}
                {c.links.github ? (
                  <a href={c.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink-50 hover:underline">
                    {C.links.github} <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                ) : null}
                {templates.map((t) => (
                  <a key={t.id} href={t.docsUrl ?? t.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink-50 hover:underline">
                    {C.links.template(t.name)} <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                ))}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
