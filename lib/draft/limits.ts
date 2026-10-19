import type { PlusFeature } from "@/lib/plan-shared";

/**
 * Server side drafting (M112). CanHav calls a model with the project
 * record as context and writes nothing itself; the client applies the
 * result through the draft's patch, so autosave and the agent revision
 * guard work as for any edit. Pure.
 */
export const DRAFT_LIMITS = {
  /** Drafts per team per calendar month, across every kind. */
  perOrgMonth: 60,
  /** Characters of project context sent, after which the record is cut. */
  maxContextChars: 40_000,
  /** Output tokens for a usual draft and for the long ones. */
  maxTokens: 4096,
  maxTokensLong: 8192,
} as const;

/** The kinds a draft route accepts, each gated by its Studio+ feature. Grows with the run. */
export const DRAFT_KIND_FEATURES = {
  canvas: "bmc",
  canvas_block: "bmc",
  icp: "icp",
  competitors: "competitors",
  brand: "brand",
  onepager: "investor_pack",
  deck: "investor_pack",
  grants: "investor_pack",
  weekly: "weekly_update",
} as const satisfies Record<string, PlusFeature>;

export type DraftKind = keyof typeof DRAFT_KIND_FEATURES;

export function isDraftKind(value: unknown): value is DraftKind {
  return typeof value === "string" && value in DRAFT_KIND_FEATURES;
}
