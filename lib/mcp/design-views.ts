import "server-only";

import { IDEATION_RESOURCES } from "@/content/ideation";
import { DEPLOYABILITY_COPY } from "@/content/ideation-resources";
import { type TokenDesignDoc, vestedCohorts } from "@/lib/ideation";
import { deployabilityFindings, deriveTokenomics } from "@/lib/tokenDesign";

/**
 * Read-only views over a token design document, shared by the global MCP
 * tools (lib/mcp/tools.ts, keyed by slug) and the project-scoped ones
 * (lib/mcp/project-tools.ts, bound to one design). Pure functions over a doc.
 */

export function designWarnings(doc: TokenDesignDoc) {
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
export function designDeployability(doc: TokenDesignDoc) {
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
export function designConstraints(doc: TokenDesignDoc, deployedAddress: string | null) {
  const derived = deriveTokenomics(doc);
  const al = doc.supply.allocations;
  return {
    // Drafts carry an empty slug until first publish, so normalize to null
    // rather than reporting "" to an agent bound to an unpublished design.
    slug: doc.slug || null,
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
