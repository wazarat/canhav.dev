import "server-only";

import raw from "@/content/research/comparables.json";
import { TEMPLATE_CATALOG_IDS } from "@/content/templates";
import { SHAPE_SUBSECTORS, type ProductShape } from "@/lib/kits";
import { SUBSECTOR_VALUES, type Subsector } from "@/lib/sectors";

/**
 * Comparables (M132, M133): how existing protocols in each subsector are
 * built, how they differ and what goes wrong with each design, exported from
 * the canhav.co research store by scripts/gen-comparables.mjs with every
 * time bound sentence removed. Served over MCP only, part of free Studio.
 * The loader checks the committed file at import and fails the build on a
 * malformed entry, the way the template catalog does.
 */
export interface ComparableComponent {
  name: string;
  description: string;
}
export interface ComparableContrast {
  slug: string;
  name: string;
  similarities?: string;
  differences?: string;
  positioning?: string;
}
export interface ComparableRisk {
  category: string;
  description: string;
}
export interface ComparableDependency {
  kind: string;
  name: string;
  description: string;
  severity: string;
}
export interface ComparableLinks {
  website?: string;
  docs?: string;
  github?: string;
  sources?: Array<{ label: string; url: string }>;
}
export interface Comparable {
  id: string;
  name: string;
  subsectors: Subsector[];
  description: string;
  differentiator?: string;
  components: ComparableComponent[];
  contrasts: ComparableContrast[];
  risks: ComparableRisk[];
  dependencies: ComparableDependency[];
  links: ComparableLinks;
  /** Contract templates in CanHav's catalog that belong to this protocol; get_templates has repo, license and deployment status. */
  templateIds: string[];
}
export interface StablecoinType {
  slug: string;
  name: string;
  symbol: string;
  pegTarget?: string;
  pegMechanism?: string;
  assetSubtype?: string;
  entitySlug?: string;
  description?: string;
  website?: string;
}
export interface ReceiptType {
  slug: string;
  name: string;
  symbol: string;
  receiptType?: string;
  baseAsset?: string;
  entitySlug?: string;
  description?: string;
  notes?: string;
}
interface ComparablesFile {
  generatedFrom: { repo: string; file: string };
  entities: Comparable[];
  assetTypes: { stablecoins: StablecoinType[]; receipts: ReceiptType[] };
}

export const COMPARABLE_SECTIONS = ["components", "contrasts", "risks", "dependencies", "links"] as const;
export type ComparableSection = (typeof COMPARABLE_SECTIONS)[number];

/** The standing note every comparables answer carries. */
export const COMPARABLES_NOTE =
  "Reference research on how protocols are designed, mostly on other chains, exported from canhav.co with every metric, date and ranking removed on purpose. Read the linked docs for anything current. A protocol appearing here says nothing about whether it is deployed on Robinhood Chain or Arbitrum testnets; get_template_catalog and the resource pack's environment block answer that.";

const ID = /^[a-z0-9][a-z0-9-]*$/;
const HTTPS = /^https:\/\/\S+$/;
const LEAKS: RegExp[] = [/\b(19|20)\d\d\b/, /\d+(\.\d+)?\s?%/, /[$€£¥]\s?\d/, /\b(TVL|APY|APR|market cap)\b/, /\bas of\b/i];
const SAFE: RegExp[] = [/\b(ERC|EIP|BIP)-?\d+\b/g, /\b[Vv]\d+(\.\d+)?\b/g, /\b\d+\s?decimals\b/g, /\b\d{1,3}\/\d{1,3}\b/g];

function leak(text: string | undefined): string | null {
  if (!text) return null;
  let t = text;
  for (const re of SAFE) t = t.replace(re, " ");
  for (const re of LEAKS) {
    const m = t.match(re);
    if (m) return m[0];
  }
  return null;
}

function assertComparables(data: ComparablesFile): void {
  const problems: string[] = [];
  if (!data.generatedFrom?.repo || !data.generatedFrom?.file) problems.push("generatedFrom is missing");
  const ids = new Set<string>();
  const subs = new Set<string>(SUBSECTOR_VALUES);
  for (const e of data.entities) {
    if (!ID.test(e.id)) problems.push(`bad id ${e.id}`);
    if (ids.has(e.id)) problems.push(`duplicate id ${e.id}`);
    ids.add(e.id);
    if (!e.name?.trim()) problems.push(`${e.id} has no name`);
    if (!e.subsectors?.length || e.subsectors.some((s) => !subs.has(s))) problems.push(`${e.id} has an unknown or empty subsector list`);
    if (!e.description?.trim()) problems.push(`${e.id} has an empty description`);
    for (const t of e.templateIds ?? []) if (!TEMPLATE_CATALOG_IDS.has(t)) problems.push(`${e.id} names unknown template ${t}`);
    for (const u of [e.links?.website, e.links?.docs, e.links?.github, ...(e.links?.sources ?? []).map((s) => s.url)])
      if (u && !HTTPS.test(u)) problems.push(`${e.id} has a non https link ${u}`);
    const prose = [e.description, e.differentiator, ...e.components.flatMap((c) => [c.name, c.description]), ...e.contrasts.flatMap((c) => [c.similarities, c.differences, c.positioning]), ...e.risks.map((r) => r.description), ...e.dependencies.map((d) => d.description)];
    for (const p of prose) {
      const l = leak(p);
      if (l) problems.push(`${e.id} carries a time bound token "${l}"`);
    }
  }
  for (const e of data.entities) for (const c of e.contrasts) if (!ids.has(c.slug)) problems.push(`${e.id} contrasts with ${c.slug}, which is not exported`);
  for (const s of data.assetTypes.stablecoins) {
    if (!ID.test(s.slug) || !s.name) problems.push(`stablecoin ${s.slug} is malformed`);
    const l = leak(s.description);
    if (l) problems.push(`stablecoin ${s.slug} carries "${l}"`);
  }
  for (const r of data.assetTypes.receipts) {
    if (!ID.test(r.slug) || !r.name) problems.push(`receipt ${r.slug} is malformed`);
    const l = leak(r.description) ?? leak(r.notes);
    if (l) problems.push(`receipt ${r.slug} carries "${l}"`);
  }
  if (problems.length) throw new Error(`Comparables file is invalid.\n${problems.map((p) => `  ${p}`).join("\n")}`);
}

const FILE = raw as unknown as ComparablesFile;
assertComparables(FILE);

export const COMPARABLES: readonly Comparable[] = FILE.entities;
export const COMPARABLES_SOURCE = FILE.generatedFrom;
export const STABLECOIN_TYPES: readonly StablecoinType[] = FILE.assetTypes.stablecoins;
export const RECEIPT_TYPES: readonly ReceiptType[] = FILE.assetTypes.receipts;

const BY_ID = new Map(COMPARABLES.map((e) => [e.id, e]));

export function comparableById(id: string): Comparable | undefined {
  return BY_ID.get(id);
}

/** The subsectors a product shape belongs to, for a shape filter. */
export function subsectorsForShape(shape: ProductShape): Subsector[] {
  return [...SHAPE_SUBSECTORS[shape]];
}

/** A comparable with only the asked sections, the rest left out of the answer. */
export function pickSections(e: Comparable, include?: readonly ComparableSection[]): Partial<Comparable> & Pick<Comparable, "id" | "name" | "subsectors" | "description" | "templateIds"> {
  const want = new Set<ComparableSection>(include?.length ? include : COMPARABLE_SECTIONS);
  return {
    id: e.id,
    name: e.name,
    subsectors: e.subsectors,
    description: e.description,
    ...(e.differentiator ? { differentiator: e.differentiator } : {}),
    ...(want.has("components") ? { components: e.components } : {}),
    ...(want.has("contrasts") ? { contrasts: e.contrasts } : {}),
    ...(want.has("risks") ? { risks: e.risks } : {}),
    ...(want.has("dependencies") ? { dependencies: e.dependencies } : {}),
    ...(want.has("links") ? { links: e.links } : {}),
    templateIds: e.templateIds,
  };
}

/** Every comparable in any of the subsectors, by name. Empty subsectors means all. */
export function comparablesForSubsectors(subs: readonly Subsector[]): Comparable[] {
  const want = new Set(subs);
  return COMPARABLES.filter((e) => want.size === 0 || e.subsectors.some((s) => want.has(s))).sort((a, b) => a.name.localeCompare(b.name));
}

/** Stablecoins and receipt tokens, filtered by the fields the store classifies them with. */
export function assetTypes(filter: { pegMechanism?: string; receiptType?: string; baseAsset?: string } = {}): { stablecoins: StablecoinType[]; receipts: ReceiptType[] } {
  const eq = (a: string | undefined, b: string | undefined) => !b || (a ?? "").toLowerCase() === b.toLowerCase();
  const stablecoins = filter.receiptType || filter.baseAsset ? [] : STABLECOIN_TYPES.filter((s) => eq(s.pegMechanism, filter.pegMechanism));
  const receipts = filter.pegMechanism ? [] : RECEIPT_TYPES.filter((r) => eq(r.receiptType, filter.receiptType) && eq(r.baseAsset, filter.baseAsset));
  return { stablecoins, receipts };
}

/** The distinct classification values, so an agent can filter without guessing. */
export function assetTypeFacets(): { pegMechanisms: string[]; receiptTypes: string[]; baseAssets: string[] } {
  const uniq = (xs: Array<string | undefined>) => [...new Set(xs.filter((x): x is string => Boolean(x)))].sort();
  return {
    pegMechanisms: uniq(STABLECOIN_TYPES.map((s) => s.pegMechanism)),
    receiptTypes: uniq(RECEIPT_TYPES.map((r) => r.receiptType)),
    baseAssets: uniq(RECEIPT_TYPES.map((r) => r.baseAsset)),
  };
}
