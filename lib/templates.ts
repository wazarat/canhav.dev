import { type ProjectChain, chainInfo } from "@/lib/chains";
import { type ProductShape, type ShapeInput, SHAPE_SUBSECTORS, toShapeList } from "@/lib/kits";
import {
  SECTOR_VALUES,
  SUBSECTOR_VALUES,
  type Sector,
  type Subsector,
  sectorOfSubsector,
} from "@/lib/sectors";

/**
 * Contract templates (M61): credible open-source templates and live
 * protocols a builder can fork, deploy from a factory, integrate or compile
 * in, one catalog entry each, placed under the subsectors they serve. The
 * entries are generated from content/templates/catalog.json (the owner's
 * research catalog) by scripts/gen-templates.mjs; types, filters and pure
 * logic live here. Imported by client components, MCP tools and the
 * markdown builders, so no Node imports and no `server-only`.
 *
 * Ids are immutable once shipped and never contain a dot, so they cannot
 * collide with a resource id ("<source>.<slug>") or a build step id
 * ("<shape>.<slug>"). A rename goes through RETIRED_TEMPLATE_IDS.
 */

export type TemplateKind = "integrate" | "fork" | "factory" | "library";
export type LicenseClass = "permissive" | "copyleft" | "restricted";
export type AuditStatus = "yes" | "no" | "partial" | "unknown";
export type ChainDeployment = "deployed" | "not_deployed" | "unknown";
export type TemplateComplexity = "low" | "medium" | "high";
export type TemplateStatus = "active" | "inactive";
/** The mainnet column a project chain reads, PROJECT_CHAIN_INFO[chain].family. */
export type ChainFamily = "robinhood" | "arbitrum";

export const TEMPLATE_KINDS: readonly TemplateKind[] = ["integrate", "fork", "factory", "library"];
export const LICENSE_CLASSES: readonly LicenseClass[] = ["permissive", "copyleft", "restricted"];
export const AUDIT_STATUSES: readonly AuditStatus[] = ["yes", "no", "partial", "unknown"];
export const CHAIN_DEPLOYMENTS: readonly ChainDeployment[] = ["deployed", "not_deployed", "unknown"];
export const TEMPLATE_COMPLEXITIES: readonly TemplateComplexity[] = ["low", "medium", "high"];
export const TEMPLATE_STATUSES: readonly TemplateStatus[] = ["active", "inactive"];
export const CHAIN_FAMILIES: readonly ChainFamily[] = ["robinhood", "arbitrum"];

export const TEMPLATE_ID = /^[a-z0-9][a-z0-9-]*$/;

export interface ContractTemplate {
  /** Catalog id, [a-z0-9][a-z0-9-]*, immutable once shipped. */
  id: string;
  name: string;
  provider: string;
  /** Subsectors the catalog places it under, table order, each once. Sectors derive from these. */
  subsectors: readonly Subsector[];
  description: string;
  kind: TemplateKind;
  /** The license as the catalog records it, change dates included. */
  license: string;
  licenseClass: LicenseClass;
  audited: AuditStatus;
  /** Who audited it, or the caveat. May be empty. */
  auditNote: string;
  repoUrl: string;
  docsUrl?: string;
  /** Mainnet status per chain family. Read with templateOnChain(). */
  chains: Record<ChainFamily, { status: ChainDeployment; note?: string }>;
  /** How it can sit behind a Pons launch. Absent when the catalog rates the fit low. */
  ponsFit?: string;
  complexity: TemplateComplexity;
  notes: string;
  /** Inactive means the protocol wound down. Background reading, left out of packs by default. */
  status: TemplateStatus;
}

/** Sectors a template belongs to, table order, each once. */
export function templateSectors(t: Pick<ContractTemplate, "subsectors">): Sector[] {
  const chosen = new Set(t.subsectors.map(sectorOfSubsector));
  return SECTOR_VALUES.filter((s) => chosen.has(s));
}

/** The mainnet column a project chain reads. robinhood_testnet reads robinhood, arbitrum_sepolia reads arbitrum. */
export function templateOnChain(
  t: Pick<ContractTemplate, "chains">,
  chain: ProjectChain,
): { status: ChainDeployment; note?: string } {
  return t.chains[chainInfo(chain).family];
}

/**
 * What a team can do with a template on a chain. ready, it is deployed there
 * and the team integrates or creates from the factory. self_deploy, a fork
 * or a library the team deploys itself, whatever the chain says. unknown,
 * the catalog has no record either way. unavailable, the protocol publishes
 * deployments and this chain is not among them. Never a block.
 */
export type TemplateAvailability = "ready" | "self_deploy" | "unknown" | "unavailable";

export const AVAILABILITY_ORDER: readonly TemplateAvailability[] = [
  "ready",
  "self_deploy",
  "unknown",
  "unavailable",
];

export function templateAvailability(t: ContractTemplate, chain: ProjectChain): TemplateAvailability {
  if (t.kind === "fork" || t.kind === "library") return "self_deploy";
  const status = templateOnChain(t, chain).status;
  if (status === "deployed") return "ready";
  if (status === "unknown") return "unknown";
  return "unavailable";
}

export interface TemplateFilter {
  kind?: TemplateKind;
  licenseClass?: LicenseClass;
  availability?: TemplateAvailability;
  /** true keeps only templates with a Pons fit line. */
  pons?: boolean;
  /** Inactive templates are left out unless true. */
  includeInactive?: boolean;
}

function passes(t: ContractTemplate, chain: ProjectChain, f: TemplateFilter): boolean {
  if (!f.includeInactive && t.status === "inactive") return false;
  if (f.kind && t.kind !== f.kind) return false;
  if (f.licenseClass && t.licenseClass !== f.licenseClass) return false;
  if (f.availability && templateAvailability(t, chain) !== f.availability) return false;
  if (f.pons && !t.ponsFit) return false;
  return true;
}

function compareTemplates(chain: ProjectChain) {
  return (a: ContractTemplate, b: ContractTemplate): number => {
    const av = AVAILABILITY_ORDER.indexOf(templateAvailability(a, chain)) - AVAILABILITY_ORDER.indexOf(templateAvailability(b, chain));
    if (av) return av;
    const c = TEMPLATE_COMPLEXITIES.indexOf(a.complexity) - TEMPLATE_COMPLEXITIES.indexOf(b.complexity);
    if (c) return c;
    return a.name.localeCompare(b.name);
  };
}

/**
 * Templates placed under any of the subsectors, sorted availability on the
 * chain, then complexity, then name. Mirrors packFor in lib/kits.ts.
 */
export function templatesForSubsectors(
  catalog: readonly ContractTemplate[],
  subsectors: readonly Subsector[],
  chain: ProjectChain,
  filter: TemplateFilter = {},
): ContractTemplate[] {
  const chosen = new Set(subsectors);
  return catalog
    .filter((t) => t.subsectors.some((s) => chosen.has(s)))
    .filter((t) => passes(t, chain, filter))
    .sort(compareTemplates(chain));
}

/** The same through the shapes' subsectors (SHAPE_SUBSECTORS). Empty when no shape. */
export function templatesForShapes(
  catalog: readonly ContractTemplate[],
  shapes: ShapeInput,
  chain: ProjectChain,
  filter: TemplateFilter = {},
): ContractTemplate[] {
  const list = toShapeList(shapes);
  if (!list.length) return [];
  const subs = new Set<Subsector>();
  for (const shape of list) for (const s of SHAPE_SUBSECTORS[shape as ProductShape]) subs.add(s);
  return templatesForSubsectors(catalog, [...subs], chain, filter);
}

/** Sort any list the way the packs do, for callers that filtered their own way. */
export function sortTemplates(list: readonly ContractTemplate[], chain: ProjectChain): ContractTemplate[] {
  return [...list].sort(compareTemplates(chain));
}

/** How many of the templates are deployed on the chain's mainnet, for the shape chip note. */
export function templateChainCounts(
  list: readonly ContractTemplate[],
  chain: ProjectChain,
): { live: number; total: number } {
  return {
    live: list.filter((t) => templateOnChain(t, chain).status === "deployed").length,
    total: list.length,
  };
}

const EM_DASH = "\u2014"; // copy-ok

/**
 * Catalog sanity, run at import so a bad entry fails the build. Checks the
 * id rule, uniqueness, placements, URLs, enums, the sector file each entry
 * sits in and the copy rule on every text field.
 */
export function assertTemplateCatalog(
  catalog: readonly ContractTemplate[],
  sectorFiles: Partial<Record<Sector, readonly ContractTemplate[]>> = {},
): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  const copy = (id: string, field: string, text: string) => {
    if (text.includes(EM_DASH)) problems.push(`${id} ${field} has an em dash`);
    if (/:\s/.test(text) || /:$/.test(text.trimEnd())) problems.push(`${id} ${field} has a colon`);
  };
  for (const t of catalog) {
    if (seen.has(t.id)) problems.push(`duplicate id ${t.id}`);
    seen.add(t.id);
    if (!TEMPLATE_ID.test(t.id)) problems.push(`bad id ${t.id}`);
    if (!t.subsectors.length) problems.push(`${t.id} has no subsector`);
    if (new Set(t.subsectors).size !== t.subsectors.length) problems.push(`${t.id} repeats a subsector`);
    for (const s of t.subsectors)
      if (!SUBSECTOR_VALUES.includes(s)) problems.push(`${t.id} unknown subsector ${s}`);
    if (!/^https:\/\/\S+$/.test(t.repoUrl)) problems.push(`${t.id} repoUrl must be https`);
    if (t.docsUrl && !/^https:\/\/\S+$/.test(t.docsUrl)) problems.push(`${t.id} docsUrl must be https`);
    if (!TEMPLATE_KINDS.includes(t.kind)) problems.push(`${t.id} unknown kind ${t.kind}`);
    if (!LICENSE_CLASSES.includes(t.licenseClass)) problems.push(`${t.id} unknown license class`);
    if (!AUDIT_STATUSES.includes(t.audited)) problems.push(`${t.id} unknown audit status`);
    if (!TEMPLATE_COMPLEXITIES.includes(t.complexity)) problems.push(`${t.id} unknown complexity`);
    if (!TEMPLATE_STATUSES.includes(t.status)) problems.push(`${t.id} unknown status`);
    for (const f of CHAIN_FAMILIES) {
      const c = t.chains[f];
      if (!c || !CHAIN_DEPLOYMENTS.includes(c.status)) problems.push(`${t.id} bad ${f} status`);
      if (c?.note) copy(t.id, `${f} note`, c.note);
    }
    copy(t.id, "name", t.name);
    copy(t.id, "provider", t.provider);
    copy(t.id, "description", t.description);
    copy(t.id, "license", t.license);
    copy(t.id, "auditNote", t.auditNote);
    copy(t.id, "notes", t.notes);
    if (t.ponsFit) copy(t.id, "ponsFit", t.ponsFit);
  }
  for (const [sector, list] of Object.entries(sectorFiles))
    for (const t of list ?? [])
      if (!templateSectors(t).includes(sector as Sector))
        problems.push(`${t.id} is in the ${sector} file but has no subsector there`);
  if (problems.length) throw new Error(`Template catalog is invalid. ${problems.join("; ")}`);
}
