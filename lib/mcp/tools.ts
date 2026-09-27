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
} from "@/lib/ideation-db";
import {
  designConstraints,
  designDeployability,
  designWarnings,
} from "@/lib/mcp/design-views";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { CREDIT_SHAPE_OPTIONS, FAMILY_LABELS } from "@/content/kits/credit";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { SHAPE_SUBSECTORS, type ProductShape } from "@/lib/kits";
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
        "A published token design's constraints as testable assertions: supply, allocations, per-cohort cliffs and durations, release type, and derived float/FDV — split into enforced-on-chain vs stated-by-team.",
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
      } else {
        return errorResult("Pass either a slug or an inline doc.");
      }
      const firstProblem = validateTokenDesignDoc(design);
      return jsonResult({
        valid: firstProblem === null,
        firstProblem,
        warnings: designWarnings(design),
        deployability: designDeployability(design),
      });
    },
  );
  registerMeteredTool(
    server,
    "get_resource_catalog",
    {
      title: "Credit resource catalog",
      description:
        "CanHav's public catalog of resources for building credit products on Robinhood Chain (Morpho, Pendle, shared standards, oracles, risk and security tooling), with the product shapes each applies to, caveat flags and where each protocol family runs today. Filter by shape, family or priority. No sign-in needed.",
      inputSchema: z.object({
        shape: z
          .enum([
            "curated_vault",
            "embedded_earn",
            "collateral_loans",
            "fixed_rate_yield",
            "embedded_fixed_rate",
            "pt_backed_borrowing",
            "leveraged_fixed_yield",
            "yield_token_exposure",
          ])
          .optional(),
        family: z.enum(["shared", "robinhood", "morpho", "pendle", "boros"]).optional(),
        priority: z.enum(["core", "recommended", "deep_dive"]).optional(),
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
        steps: r.steps,
        priority: r.priority,
        flags: [...(r.flags ?? [])],
      }));
      return jsonResult({
        shapes: CREDIT_SHAPE_OPTIONS.map((o) => ({
          id: o.value,
          label: o.label,
          subsectors: SHAPE_SUBSECTORS[o.value],
        })),
        environments: Object.values(KIT_ENVIRONMENTS),
        total: resources.length,
        resources,
      });
    },
  );

}
