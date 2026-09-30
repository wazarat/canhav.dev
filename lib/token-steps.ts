import type { IndexedCurve } from "@/lib/indexer";
import type { TokenDesignDoc } from "@/lib/ideation";

/**
 * Token build steps (M46). The guided steps for a token design and its
 * launch, one list for every design. Types and pure helpers live here, the
 * steps and their copy in content/token-steps.ts. Imported by client
 * components, the MCP tools and the markdown builders, so no Node imports
 * and no `server-only`.
 *
 * Design steps and the post-launch commitments are ticked by the builder
 * (or by an agent on the linked project). Publish, link, launch, the snipe
 * window and graduation are read from the platform and never ticked; a
 * stored tick on one of those ids is ignored. Ticks live in
 * doc.checklist as a map of true entries, like a project's kit.checklist,
 * and are stripped from the published snapshot so a tick after launch never
 * changes the hash the launch committed.
 */

export type TokenStepKey =
  | "rationale"
  | "supply"
  | "vesting"
  | "distribution"
  | "market"
  | "governance"
  | "legal"
  | "postLaunch"
  | "launch";

export const TOKEN_STEP_KEYS: readonly TokenStepKey[] = [
  "rationale",
  "supply",
  "vesting",
  "distribution",
  "market",
  "governance",
  "legal",
  "postLaunch",
  "launch",
];

export type TokenStepPhase = "design" | "launch";
export type TokenStepAuto = "published" | "linked" | "deployed" | "window" | "graduated";
export type TokenStepLink = "publicPage" | "project" | "launch" | "tokenPage";

export interface TokenStep {
  /** "token.<slug>", immutable once shipped. */
  id: `token.${string}`;
  title: string;
  /** One or two sentences on what done looks like. */
  detail: string;
  /** The editor step this item informs, or "launch" for the launch stages. */
  step: TokenStepKey;
  phase: TokenStepPhase;
  /** Read from the platform instead of ticked. */
  auto?: TokenStepAuto;
  /** Where the row points, resolved by the section. */
  link?: TokenStepLink;
}

/** What the platform knows about a design's launch, gathered by the caller. */
export interface TokenLaunchFacts {
  published: boolean;
  linked: boolean;
  deployedAddress: string | null;
  /** null when the token is not on a curve (a factory deploy) or the indexer had nothing. */
  curve: Pick<IndexedCurve, "graduated" | "windowEnd"> | null;
  /** Unix seconds. */
  now: number;
}

export type TokenStepState = "done" | "open" | "na";

export interface TokenBuildRow {
  step: TokenStep;
  state: TokenStepState;
  /** True for a row read from the platform. */
  computed: boolean;
}

export function autoState(rule: TokenStepAuto, facts: TokenLaunchFacts): TokenStepState {
  switch (rule) {
    case "published":
      return facts.published ? "done" : "open";
    case "linked":
      return facts.linked ? "done" : "open";
    case "deployed":
      return facts.deployedAddress ? "done" : "open";
    case "window":
      if (!facts.deployedAddress) return "open";
      if (!facts.curve) return "na";
      return facts.curve.graduated || facts.now >= Number(facts.curve.windowEnd) ? "done" : "open";
    case "graduated":
      if (!facts.deployedAddress) return "open";
      if (!facts.curve) return "na";
      return facts.curve.graduated ? "done" : "open";
  }
}

export function tokenBuildRows(
  steps: readonly TokenStep[],
  doc: Pick<TokenDesignDoc, "checklist"> | undefined,
  facts: TokenLaunchFacts,
): TokenBuildRow[] {
  const ticks = doc?.checklist ?? {};
  return steps.map((step) =>
    step.auto
      ? { step, state: autoState(step.auto, facts), computed: true }
      : { step, state: ticks[step.id] === true ? "done" : "open", computed: false },
  );
}

/** Done of total, rows that do not apply left out of both. */
export function tokenBuildProgress(
  steps: readonly TokenStep[],
  doc: Pick<TokenDesignDoc, "checklist"> | undefined,
  facts: TokenLaunchFacts,
): { done: number; total: number } {
  const rows = tokenBuildRows(steps, doc, facts).filter((r) => r.state !== "na");
  return { done: rows.filter((r) => r.state === "done").length, total: rows.length };
}

/** Flip one manual step and return the patched field. Never stores false. */
export function toggleTokenStep(
  doc: Pick<TokenDesignDoc, "checklist">,
  id: string,
  done: boolean,
): Pick<TokenDesignDoc, "checklist"> {
  const next: Record<string, true> = { ...(doc.checklist ?? {}) };
  if (done) next[id] = true;
  else delete next[id];
  return Object.keys(next).length ? { checklist: next } : { checklist: undefined };
}

export function tokenStepIds(steps: readonly TokenStep[]): Set<string> {
  return new Set(steps.map((s) => s.id));
}

export function manualTokenStepIds(steps: readonly TokenStep[]): Set<string> {
  return new Set(steps.filter((s) => !s.auto).map((s) => s.id));
}

export function assertTokenSteps(steps: readonly TokenStep[]): void {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const s of steps) {
    if (seen.has(s.id)) problems.push(`duplicate token step id ${s.id}`);
    seen.add(s.id);
    if (!s.id.startsWith("token.")) problems.push(`${s.id} is not under token.`);
    if (!TOKEN_STEP_KEYS.includes(s.step)) problems.push(`${s.id} unknown step ${s.step}`);
    if (s.auto && s.phase !== "launch") problems.push(`${s.id} is computed but not a launch step`);
  }
  if (problems.length) throw new Error(`Token build steps are invalid. ${problems.join("; ")}`);
}
