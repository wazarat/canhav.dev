import { LAUNCH_CURVE } from "@/content/launch";
import type { TokenDesignDoc } from "@/lib/ideation";
import {
  type TokenBuildRow,
  type TokenLaunchFacts,
  type TokenStep,
  type TokenStepKey,
  assertTokenSteps,
  tokenBuildProgress,
  tokenBuildRows,
} from "@/lib/token-steps";

/**
 * The sixteen token build steps (M46), eight for the design sections and
 * eight for the launch stages, in the order a small team takes them. Copy
 * rules apply. No colons, no em dashes. The numbers come from LAUNCH_CURVE.
 */
export const TOKEN_STEPS: readonly TokenStep[] = [
  {
    id: "token.rationale",
    title: "Write down why this needs a token",
    detail:
      "The why, the issuance path and the database row answer read as one argument. A teammate who disagrees can point at the sentence they disagree with.",
    step: "rationale",
    phase: "design",
  },
  {
    id: "token.supply",
    title: "Fix the supply and the allocation split",
    detail:
      "Total supply, fixed or inflationary, and a split that sums to 100 with every slice named. The float at launch in the computed panel is a number you would defend.",
    step: "supply",
    phase: "design",
  },
  {
    id: "token.vesting",
    title: "Set cliffs and durations for every vested cohort",
    detail:
      "Team, investors and advisors each have a cliff and a duration, the release type is chosen and the founder departure rule is written down.",
    step: "vesting",
    phase: "design",
  },
  {
    id: "token.sale-plan",
    title: "Decide the distribution event and its terms",
    detail:
      "None, an airdrop or a sale. For a sale the price, the caps, access and the undersubscription plan are set, and the Review step says which parts CanHav can run.",
    step: "distribution",
    phase: "design",
  },
  {
    id: "token.market",
    title: "Plan the market at launch",
    detail:
      "Liquidity amount, where the ETH comes from, LP treatment and anti sniping. The curve fixes the window and the tax, so the plan matches what the platform does.",
    step: "market",
    phase: "design",
  },
  {
    id: "token.governance",
    title: "Declare governance, admin keys and treasury custody",
    detail:
      "Each of the three is in place, planned before mainnet or not yet, with a note where it is in place. Admin keys name a multisig, not a person.",
    step: "governance",
    phase: "design",
  },
  {
    id: "token.legal",
    title: "Record the counsel status",
    detail:
      "Working with counsel, engaging before mainnet or not yet, and the legal topics read with someone who can act on them.",
    step: "legal",
    phase: "design",
  },
  {
    id: "token.post-launch-plan",
    title: "Write the post-launch plan",
    detail:
      "Treasury runway, reporting cadence, the price collapse response and the failure criteria are answered rather than left optional.",
    step: "postLaunch",
    phase: "design",
  },
  {
    id: "token.publish",
    title: "Publish the design",
    detail:
      "Publishing snapshots the design and gives it a public page. The snapshot hash is what a launch commits on chain.",
    step: "launch",
    phase: "launch",
    auto: "published",
    link: "publicPage",
  },
  {
    id: "token.link",
    title: "Link the design to a project",
    detail:
      "A linked project gives the token a product to point at, and gives agents on that project's server this design.",
    step: "launch",
    phase: "launch",
    auto: "linked",
    link: "project",
  },
  {
    id: "token.launch",
    title: "Launch the token with the design committed",
    detail:
      "Launch from the published design so the contract commits its snapshot hash, or attach a contract that already does.",
    step: "launch",
    phase: "launch",
    auto: "deployed",
    link: "launch",
  },
  {
    id: "token.window",
    title: "Watch the snipe window and the curve",
    detail: `The first ${LAUNCH_CURVE.windowSeconds} seconds tax buys. Watch the curve fill and answer holders in the open.`,
    step: "launch",
    phase: "launch",
    auto: "window",
    link: "tokenPage",
  },
  {
    id: "token.graduation",
    title: "Graduate to the locked pool",
    detail: `At ${LAUNCH_CURVE.thresholdEth} ETH raised the curve seeds a pool the launcher holds. Confirm the pool and its depth on the token page.`,
    step: "launch",
    phase: "launch",
    auto: "graduated",
    link: "tokenPage",
  },
  {
    id: "token.sale",
    title: "Create the sale or escrow the design promised",
    detail:
      "The distribution event and vesting are second transactions after launch. Create the sale, the escrow tranches or the vesting wallet the design describes, or note why not.",
    step: "launch",
    phase: "launch",
    link: "tokenPage",
  },
  {
    id: "token.first-update",
    title: "Post the first milestone update",
    detail:
      "The first update on the token page, signed by the deployer wallet. A design committed launch has no milestone list yet, so say what was done and what is next.",
    step: "launch",
    phase: "launch",
    link: "tokenPage",
  },
  {
    id: "token.report",
    title: "Start the reporting cadence",
    detail:
      "The first report at the cadence the design promised, with treasury, runway and what changed since launch.",
    step: "launch",
    phase: "launch",
    link: "tokenPage",
  },
];

export const TOKEN_STEP_LABELS: Record<TokenStepKey, string> = {
  rationale: "Rationale",
  supply: "Supply",
  vesting: "Vesting",
  distribution: "Distribution",
  market: "Market",
  governance: "Governance",
  legal: "Legal",
  postLaunch: "Post-launch",
  launch: "Launch",
};

export const TOKEN_STEPS_COPY = {
  pillLabel: (ticker: string) => (ticker.trim() ? ticker.trim() : "Token build steps"),
  title: "Token build steps",
  intro:
    "The order a small team takes a token from design to a launched, graduated market. These steps never block publishing. Rows marked as read from the platform tick themselves; the rest you tick when the work is written down, and an agent on the linked project can tick them for you.",
  noProject:
    "Link this design to a project to let an agent on that project's server read and tick these steps.",
  computedNote: "Read from the platform, not ticked.",
  phases: { design: "Design", launch: "Launch" } as const,
  states: {
    done: "Done, read from the platform",
    open: "Not yet",
    na: "Does not apply",
  } as const,
  naNote: (n: number) =>
    n === 1
      ? "1 row does not apply to this token and is left out of the count."
      : `${n} rows do not apply to this token and are left out of the count.`,
  openProblem: "Build steps open",
  reviewRow: (done: number, total: number) => `Build steps ${done} of ${total} done`,
  links: {
    publicPage: "Open the public page",
    project: "Open the project",
    launch: "Launch from this design",
    tokenPage: "Open the token page",
  } as const,
  computedTag: "read from the platform",
  naTag: "does not apply",
} as const;

/** Rows and progress bound to TOKEN_STEPS. */
export function tokenBuildRowsOf(
  doc: Pick<TokenDesignDoc, "checklist"> | undefined,
  facts: TokenLaunchFacts,
): TokenBuildRow[] {
  return tokenBuildRows(TOKEN_STEPS, doc, facts);
}

export function tokenBuildProgressOf(
  doc: Pick<TokenDesignDoc, "checklist"> | undefined,
  facts: TokenLaunchFacts,
): { done: number; total: number } {
  return tokenBuildProgress(TOKEN_STEPS, doc, facts);
}

assertTokenSteps(TOKEN_STEPS);
