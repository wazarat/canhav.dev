import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { type TokenDesignDoc, validateTokenDesignDoc } from "@/lib/ideation";
import {
  getMyProjects,
  getMyTokenDesigns,
  getProjectBySlug,
  getSnapshot,
  getTokenDesignBySlug,
  getLinkedProject,
} from "@/lib/ideation-db";
import {
  designConstraints,
  designDeployability,
  designWarnings,
} from "@/lib/mcp/design-views";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { GATE_COPY, SHAPE_OPTIONS, FAMILY_LABELS } from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { SECTOR_OPTIONS, SUBSECTOR_OPTIONS_BY_SECTOR } from "@/content/ideation";
import { TEMPLATE_CATALOG, TEMPLATE_CATALOG_GENERATED } from "@/content/templates";
import { type ProjectChain, PROJECT_CHAINS, PROJECT_CHAIN_INFO, projectChainOf } from "@/lib/chains";
import {
  type KitFamily,
  type KitPriority,
  KIT_FAMILY_ORDER,
  KIT_PRIORITY_ORDER,
  PRODUCT_SHAPE_VALUES,
  SHAPE_SUBSECTORS,
  type ProductShape,
  kitShapes,
  shapeRunsOnTestnet,
  shapesMissingTestnet,
} from "@/lib/kits";
import { SECTOR_VALUES, SUBSECTOR_VALUES, type Sector, type Subsector, docSectors, sectorOfSubsector } from "@/lib/sectors";
import {
  AVAILABILITY_ORDER,
  type ContractTemplate,
  LICENSE_CLASSES,
  type LicenseClass,
  TEMPLATE_KINDS,
  type TemplateAvailability,
  type TemplateKind,
  templateAvailability,
  templateOnChain,
  templateSectors,
  templatesForSubsectors,
} from "@/lib/templates";
import { registerLaunchTools } from "@/lib/mcp/launch-tools";
import { deriveTokenomics } from "@/lib/tokenDesign";
import {
  errorResult,
  jsonResult,
  mcpUserId,
  registerMeteredTool,
} from "@/lib/mcp/register";

/**
 * MCP tools over the user's own ideation data. Published snapshots are
 * readable without auth (they're public web pages); drafts and "my" listings
 * require a Clerk OAuth token. All reads go through lib/ideation-db.ts.
 */

const AUTH_HINT =
  "Authorize this MCP server via OAuth (a free CanHav account) to access your own records.";
const DB_HINT = "Storage not configured.";

export function registerAllTools(server: McpServer): void {
  registerLaunchTools(server);
  registerMeteredTool(
    server,
    "get_my_projects",
    {
      title: "My projects",
      description:
        "List the authenticated user's CanHav project records (drafts and published).",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const userId = mcpUserId(ctx);
      if (!userId) return errorResult(AUTH_HINT);
      const rows = await getMyProjects(userId);
      if (rows === null) return errorResult(DB_HINT);
      return jsonResult(
        rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          status: r.status,
          name: r.draft_doc.name,
          sector: r.draft_doc.sector,
          sectors: docSectors(r.draft_doc),
          subsectors: r.draft_doc.subsectors ?? [],
          stage: r.draft_doc.stage,
          updatedAt: r.updated_at,
        })),
      );
    },
  );

  registerMeteredTool(
    server,
    "get_my_tokens",
    {
      title: "My token designs",
      description:
        "List the authenticated user's CanHav token designs (drafts and published).",
      inputSchema: z.object({}),
    },
    async (_args, ctx) => {
      const userId = mcpUserId(ctx);
      if (!userId) return errorResult(AUTH_HINT);
      const rows = await getMyTokenDesigns(userId);
      if (rows === null) return errorResult(DB_HINT);
      return jsonResult(
        rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          status: r.status,
          name: r.draft_doc.name,
          ticker: r.draft_doc.ticker,
          deployedAddress: r.deployed_token_address,
          updatedAt: r.updated_at,
        })),
      );
    },
  );

  registerMeteredTool(
    server,
    "get_project",
    {
      title: "Get project",
      description:
        "A published CanHav project by slug (public). Owners additionally get their current draft state.",
      inputSchema: z.object({ slug: z.string().min(3).max(60) }),
    },
    async ({ slug }, ctx) => {
      const row = await getProjectBySlug(slug);
      if (!row?.published_hash) return errorResult(`No published project at /p/${slug}.`);
      const snapshot = await getSnapshot(row.published_hash);
      if (!snapshot) return errorResult(DB_HINT);
      const isOwner = mcpUserId(ctx) === row.owner_id;
      return jsonResult({
        slug,
        publishedVersion: snapshot.version,
        publishedAt: snapshot.created_at,
        snapshotHash: snapshot.snapshot_hash,
        doc: snapshot.doc,
        ...(isOwner ? { status: row.status, draft: row.draft_doc } : {}),
      });
    },
  );

  registerMeteredTool(
    server,
    "get_token",
    {
      title: "Get token design",
      description:
        "A published CanHav token design by slug (public), including derived tokenomics. Owners additionally get their current draft state.",
      inputSchema: z.object({ slug: z.string().min(3).max(60) }),
    },
    async ({ slug }, ctx) => {
      const row = await getTokenDesignBySlug(slug);
      if (!row?.published_hash) return errorResult(`No published token design at /t/${slug}.`);
      const snapshot = await getSnapshot(row.published_hash);
      if (!snapshot || snapshot.doc.kind !== "token_design") return errorResult(DB_HINT);
      const isOwner = mcpUserId(ctx) === row.owner_id;
      return jsonResult({
        slug,
        publishedVersion: snapshot.version,
        publishedAt: snapshot.created_at,
        snapshotHash: snapshot.snapshot_hash,
        deployedAddress: row.deployed_token_address,
        doc: snapshot.doc,
        derived: deriveTokenomics(snapshot.doc),
        ...(isOwner ? { status: row.status, draft: row.draft_doc } : {}),
      });
    },
  );

  registerMeteredTool(
    server,
    "get_design_constraints",
    {
      title: "Design constraints",
      description:
        "A published token design's constraints as testable assertions. Supply, allocations, per-cohort cliffs and durations, release type, and derived float and FDV, split into enforced-on-chain vs stated-by-team.",
      inputSchema: z.object({ slug: z.string().min(3).max(60) }),
    },
    async ({ slug }) => {
      const row = await getTokenDesignBySlug(slug);
      if (!row?.published_hash) return errorResult(`No published token design at /t/${slug}.`);
      const snapshot = await getSnapshot(row.published_hash);
      if (!snapshot || snapshot.doc.kind !== "token_design") return errorResult(DB_HINT);
      return jsonResult(designConstraints(snapshot.doc, row.deployed_token_address));
    },
  );

  registerMeteredTool(
    server,
    "check_design",
    {
      title: "Check a token design",
      description:
        "Run CanHav's design warning rules and deployability classification (deployable through CanHav / needs custom contracts / stated-only). Pass a published design's slug, or an inline TokenDesignDoc JSON (kind 'token_design', version 1) to check a local draft.",
      inputSchema: z.object({
        slug: z.string().min(3).max(60).optional(),
        doc: z.record(z.string(), z.unknown()).optional(),
      }),
    },
    async ({ slug, doc }) => {
      let design: TokenDesignDoc | null = null;
      let shapes: ProductShape[] = [];
      let chain: ProjectChain | undefined;
      if (doc) {
        if (doc.kind !== "token_design" || doc.version !== 1)
          return errorResult('Inline doc must have kind "token_design" and version 1.');
        design = doc as unknown as TokenDesignDoc;
      } else if (slug) {
        const row = await getTokenDesignBySlug(slug);
        if (!row?.published_hash)
          return errorResult(`No published token design at /t/${slug}.`);
        const snapshot = await getSnapshot(row.published_hash);
        if (!snapshot || snapshot.doc.kind !== "token_design") return errorResult(DB_HINT);
        design = snapshot.doc;
        // A published design linked to a project shows that project's shapes publicly (M47).
        const linked = await getLinkedProject(row.id);
        if (linked?.status === "published") {
          shapes = kitShapes(linked.draft_doc.kit);
          chain = projectChainOf(linked.draft_doc);
        }
      } else {
        return errorResult("Pass either a slug or an inline doc.");
      }
      const firstProblem = validateTokenDesignDoc(design);
      return jsonResult({
        valid: firstProblem === null,
        firstProblem,
        warnings: designWarnings(design, { shapes, chain }),
        deployability: designDeployability(design),
      });
    },
  );
  registerMeteredTool(
    server,
    "get_resource_catalog",
    {
      title: "Resource catalog",
      description:
        "CanHav's public catalog of resources for building products in every sector on Robinhood Chain or Arbitrum (Morpho, Pendle, Uniswap, the sector kits, shared standards, oracles, risk and security tooling), with the product shapes each applies to, the subsectors and sectors each shape belongs to, caveat flags, where each protocol family runs today on each chain a project can pick (chains, with environments per chain) and which shapes rely on a protocol with no deployment on a chain's testnet (runsOnTestnetByChain per shape, testnetGate at the top). Such a shape can still be picked, and the team or its agent writes the build steps that fit. runsOnTestnet and environments at the top level describe Robinhood Chain, kept for older readers. Filter by shape, family or priority. No sign-in needed.",
      inputSchema: z.object({
        shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]).optional(),
        family: z.enum(KIT_FAMILY_ORDER as [KitFamily, ...KitFamily[]]).optional(),
        priority: z.enum(KIT_PRIORITY_ORDER as [KitPriority, ...KitPriority[]]).optional(),
      }),
    },
    async ({ shape, family, priority }) => {
      const subsOf = (s: ProductShape) => SHAPE_SUBSECTORS[s];
      const resources = KIT_CATALOG.filter((r) => {
        if (family && r.family !== family) return false;
        if (priority && r.priority !== priority) return false;
        if (shape) {
          if (r.shapes === "all")
            return !r.subsectors || r.subsectors.some((x) => subsOf(shape).includes(x));
          return r.shapes.includes(shape);
        }
        return true;
      }).map((r) => ({
        id: r.id,
        family: r.family,
        familyLabel: FAMILY_LABELS[r.family],
        kind: r.kind,
        title: r.title,
        url: r.href,
        ...(r.rawHref ? { rawUrl: r.rawHref } : {}),
        why: r.why,
        shapes: r.shapes,
        ...(r.subsectors ? { subsectors: r.subsectors } : {}),
        ...(r.kits ? { kits: r.kits } : {}),
        steps: r.steps,
        priority: r.priority,
        flags: [...(r.flags ?? [])],
        ...(r.chains ? { chains: r.chains } : {}),
      }));
      return jsonResult({
        shapes: SHAPE_OPTIONS.map((o) => ({
          id: o.value,
          label: o.label,
          subsectors: SHAPE_SUBSECTORS[o.value],
          sectors: [...new Set(SHAPE_SUBSECTORS[o.value].map(sectorOfSubsector))],
          runsOnTestnet: shapeRunsOnTestnet(o.value, KIT_ENVIRONMENTS.robinhood_testnet),
          runsOnTestnetByChain: Object.fromEntries(
            PROJECT_CHAINS.map((c) => [c, shapeRunsOnTestnet(o.value, KIT_ENVIRONMENTS[c])]),
          ),
          examples: o.examples,
        })),
        chains: PROJECT_CHAINS.map((c) => ({
          key: c,
          name: PROJECT_CHAIN_INFO[c].name,
          testnetChainId: PROJECT_CHAIN_INFO[c].chainId,
          mainnetChainId: PROJECT_CHAIN_INFO[c].mainnetChainId,
          shapesMissingTestnet: shapesMissingTestnet(KIT_ENVIRONMENTS[c]),
          environments: Object.values(KIT_ENVIRONMENTS[c]),
        })),
        // Nothing is blocked since M52. The key stays for older readers.
        testnetGate: { blockedShapes: [] as ProductShape[], rule: GATE_COPY.catalogRule },
        environments: Object.values(KIT_ENVIRONMENTS.robinhood_testnet),
        total: resources.length,
        resources,
      });
    },
  );

  registerMeteredTool(
    server,
    "get_template_catalog",
    {
      title: "Contract template catalog",
      description:
        "CanHav's public catalog of contract templates (M61), credible open-source templates and live protocols a builder can fork, deploy from a factory, integrate or compile in, placed under the subsectors they serve across every sector (Credit, Liquidity, Derivatives, Staking, RWA, Other). Each carries kind, license and license class, audit status, repo and docs, mainnet status on Robinhood Chain 4663 and Arbitrum One 42161 with a note, complexity, a Pons fit line when the template can sit behind a Pons launch, and status (inactive protocols are left out unless includeInactive). Pass chain to get onChain per template (the status read for that project chain's mainnet and availability, ready, self_deploy, unknown or unavailable) and to sort by it. Filter by sector, subsector or shape, kind, licenseClass, availability (needs chain) and pons. Research preview, not an audit or legal advice. No sign-in needed.",
      inputSchema: z.object({
        sector: z.enum(SECTOR_VALUES as [Sector, ...Sector[]]).optional(),
        subsector: z.enum(SUBSECTOR_VALUES as [Subsector, ...Subsector[]]).optional(),
        shape: z.enum(PRODUCT_SHAPE_VALUES as [ProductShape, ...ProductShape[]]).optional(),
        chain: z.enum(PROJECT_CHAINS).optional(),
        kind: z.enum(TEMPLATE_KINDS as [TemplateKind, ...TemplateKind[]]).optional(),
        licenseClass: z.enum(LICENSE_CLASSES as [LicenseClass, ...LicenseClass[]]).optional(),
        availability: z.enum(AVAILABILITY_ORDER as [TemplateAvailability, ...TemplateAvailability[]]).optional(),
        pons: z.boolean().optional(),
        includeInactive: z.boolean().optional(),
      }),
    },
    async ({ sector, subsector, shape, chain, kind, licenseClass, availability, pons, includeInactive }) => {
      if (availability && !chain) return errorResult("availability needs chain, the project chain whose mainnet is read.");
      const sortChain: ProjectChain = chain ?? "robinhood_testnet";
      let subs: Subsector[] | null = null;
      if (subsector) subs = [subsector];
      else if (shape) subs = [...SHAPE_SUBSECTORS[shape]];
      else if (sector) subs = [...SUBSECTOR_VALUES.filter((s) => sectorOfSubsector(s) === sector)];
      const list = templatesForSubsectors(TEMPLATE_CATALOG, subs ?? SUBSECTOR_VALUES, sortChain, {
        kind,
        licenseClass,
        availability,
        pons,
        includeInactive,
      });
      const view = (t: ContractTemplate) => ({
        ...t,
        sectors: templateSectors(t),
        ...(chain
          ? {
              onChain: {
                chain,
                mainnetChainId: PROJECT_CHAIN_INFO[chain].mainnetChainId,
                ...templateOnChain(t, chain),
                availability: templateAvailability(t, chain),
              },
            }
          : {}),
      });
      const sectorLabel = (s: Sector) => SECTOR_OPTIONS.find((o) => o.value === s)?.label ?? s;
      return jsonResult({
        generated: TEMPLATE_CATALOG_GENERATED,
        taxonomy: SECTOR_VALUES.map((s) => ({
          sector: s,
          label: sectorLabel(s),
          open: SECTOR_OPTIONS.find((o) => o.value === s)?.available !== false,
          subsectors: (SUBSECTOR_OPTIONS_BY_SECTOR[s] ?? []).map((o) => ({ id: o.value, label: o.label })),
        })),
        chains: PROJECT_CHAINS.map((c) => ({
          key: c,
          name: PROJECT_CHAIN_INFO[c].name,
          mainnetChainId: PROJECT_CHAIN_INFO[c].mainnetChainId,
          mainnetName: PROJECT_CHAIN_INFO[c].mainnetName,
          family: PROJECT_CHAIN_INFO[c].family,
        })),
        total: list.length,
        templates: list.map(view),
      });
    },
  );
}
