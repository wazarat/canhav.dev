import "server-only";

import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { IDEATION_RESOURCES } from "@/content/ideation";
import { DEPLOYABILITY_COPY } from "@/content/ideation-resources";
import {
  type TokenDesignDoc,
  validateTokenDesignDoc,
  vestedCohorts,
} from "@/lib/ideation";
import {
  getMyProjects,
  getMyTokenDesigns,
  getProjectBySlug,
  getSnapshot,
  getTokenDesignBySlug,
} from "@/lib/ideation-db";
import { registerLaunchTools } from "@/lib/mcp/launch-tools";
import { deployabilityFindings, deriveTokenomics } from "@/lib/tokenDesign";
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

function designWarnings(doc: TokenDesignDoc) {
  const derived = deriveTokenomics(doc);
  return derived.warnings.map((code) => ({
    code,
    title: IDEATION_RESOURCES[code].title,
    body: IDEATION_RESOURCES[code].body,
  }));
}

/**
 * Which parts of the design the CanHav contract suite can produce, tiered:
 * "canhav" (deployable, possibly a separate contract or second transaction),
 * "custom" (requires contracts outside CanHav), "stated" (recorded and shown,
 * never enforced). `deployableAsDesigned` is false when any "custom" finding
 * exists.
 */
function designDeployability(doc: TokenDesignDoc) {
  const findings = deployabilityFindings(doc).map((code) => ({
    code,
    tier: DEPLOYABILITY_COPY[code].tier,
    text: DEPLOYABILITY_COPY[code].text,
  }));
  return {
    deployableAsDesigned: findings.every((f) => f.tier !== "custom"),
    findings,
  };
}

/** The team's stated design as testable assertions. */
function designConstraints(doc: TokenDesignDoc, deployedAddress: string | null) {
  const derived = deriveTokenomics(doc);
  const al = doc.supply.allocations;
  return {
    slug: doc.slug,
    name: doc.name,
    ticker: doc.ticker,
    deployedAddress,
    // What a CanHav factory deploy enforces. Always fixed-supply: when the
    // stated policy below is "inflationary", the design as written cannot
    // deploy through the factory (see deployability.findings).
    enforcedOnChain: {
      totalSupply: doc.supply.total,
      fixedSupply: true,
      mintable: false,
      pausable: false,
      upgradeable: false,
      teamVesting:
        doc.vesting.cohorts.find((c) => c.cohort === "team") ?? null,
      ...(doc.supply.policy === "inflationary"
        ? {
            note:
              "The design states an inflationary policy, but the factory " +
              "only deploys fixed-supply tokens; inflation requires custom " +
              "contracts outside CanHav.",
          }
        : {}),
    },
    deployability: designDeployability(doc),
    statedByTeam: {
      supplyPolicy: doc.supply.policy,
      allocationsPct: {
        team: al.team,
        investors: al.investors,
        treasuryEcosystem: al.treasuryEcosystem,
        public: al.public,
        liquidity: al.liquidity,
        advisors: al.advisors,
        other: al.other,
        ...(al.otherLabel ? { otherLabel: al.otherLabel } : {}),
      },
      vestingCohorts: doc.vesting.cohorts,
      releaseType: doc.vesting.release,
      vestedCohorts: vestedCohorts(al),
      distributionEvent: doc.distribution.event,
      marketAtLaunch: doc.market.when,
    },
    derived: {
      floatAtLaunchPct: derived.floatAtLaunchPct,
      fdvToFloat: derived.fdvToFloat,
      treasuryPct: derived.treasuryPct,
      clusterMonths: derived.clusterMonths,
      milestoneUncertain: derived.milestoneUncertain,
    },
  };
}

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
}
