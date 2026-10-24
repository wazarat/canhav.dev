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
  value_canvas: "icp",
  competitors: "competitors",
  brand: "brand",
  // The one pager and the deck (M159) are requests for the agent, or a prompt to copy; CanHav drafts neither.
  onepager: "investor_pack",
  deck: "investor_pack",
  weekly: "weekly_update",
} as const satisfies Record<string, PlusFeature>;

export type DraftKind = keyof typeof DRAFT_KIND_FEATURES;

/**
 * The server model per kind (M117, the owner's choice): Haiku 5.5 for the
 * short kinds, Sonnet 5.5 for the investor pack. Opus 5.5 is the constant
 * to move a kind up to if the side by side test finds quality short.
 */
export const DRAFT_MODEL_FALLBACK = "claude-opus-5-5";
export const DRAFT_MODELS: Record<DraftKind, string> = {
  canvas: "claude-haiku-5-5",
  canvas_block: "claude-haiku-5-5",
  icp: "claude-haiku-5-5",
  value_canvas: "claude-haiku-5-5",
  competitors: "claude-haiku-5-5",
  brand: "claude-haiku-5-5",
  onepager: "claude-sonnet-5-5",
  deck: "claude-sonnet-5-5",
  weekly: "claude-haiku-5-5",
};

export function isDraftKind(value: unknown): value is DraftKind {
  return typeof value === "string" && value in DRAFT_KIND_FEATURES;
}
