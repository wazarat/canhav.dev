import { KIT_CATALOG_IDS } from "@/content/kits/catalog";
import { TEMPLATE_CATALOG_IDS } from "@/content/templates";
import {
  type ChecklistItem,
  type ProductShape,
  type ProductSection,
  type ProjectKit,
  type ShapeId,
  type ShapeInput,
  type StepGroup,
  assertChecklists,
  assertSharedSteps,
  groupProgress,
  kitShapes,
  productSectionsFor,
  removedGroups,
  toShapeList,
  withFeatureSteps,
  withKitSteps,
  withOwnShapes,
} from "@/lib/kits";

import { SHARED_STEPS } from "./shared";

import {
  EMBEDDED_FIXED_RATE_CHECKLIST,
  FIXED_RATE_YIELD_CHECKLIST,
  PT_BACKED_BORROWING_CHECKLIST,
} from "./fixed-income";
import {
  COLLATERAL_LOANS_CHECKLIST,
  CURATED_VAULT_CHECKLIST,
  EMBEDDED_EARN_CHECKLIST,
} from "./lending";
import { LEVERAGED_FIXED_YIELD_CHECKLIST, YIELD_TOKEN_EXPOSURE_CHECKLIST } from "./leveraged-yield";
import {
  BASIC_AMM_POOL_CHECKLIST,
  CONCENTRATED_LIQUIDITY_POOL_CHECKLIST,
  HOOK_POOL_CHECKLIST,
} from "./pools";
import { LIQUIDITY_ALLOCATOR_CHECKLIST, PERMISSIONED_VAULT_CHECKLIST } from "./vaults";
import { DELTA_NEUTRAL_VAULT_CHECKLIST, OPTION_VAULT_CHECKLIST, PERP_EXCHANGE_CHECKLIST } from "./derivatives";
import { LIQUID_RESTAKING_TOKEN_CHECKLIST, LIQUID_STAKING_TOKEN_CHECKLIST, RESTAKING_SERVICE_CHECKLIST } from "./staking";
import { ASSET_BACKED_TOKEN_CHECKLIST, PRIVATE_CREDIT_POOL_CHECKLIST, TOKENIZED_SECURITY_CHECKLIST } from "./rwa";
import { COVER_POOL_CHECKLIST, GOVERNANCE_STACK_CHECKLIST } from "./other";

/**
 * Build checklists by shape, all twenty-four. assertChecklists runs at import and
 * fails the build on a duplicate id or a reference to a resource or a
 * contract template that is not in its catalog.
 */
export const KIT_CHECKLISTS: Partial<Record<ProductShape, readonly ChecklistItem[]>> = {
  curated_vault: CURATED_VAULT_CHECKLIST,
  embedded_earn: EMBEDDED_EARN_CHECKLIST,
  collateral_loans: COLLATERAL_LOANS_CHECKLIST,
  fixed_rate_yield: FIXED_RATE_YIELD_CHECKLIST,
  embedded_fixed_rate: EMBEDDED_FIXED_RATE_CHECKLIST,
  pt_backed_borrowing: PT_BACKED_BORROWING_CHECKLIST,
  leveraged_fixed_yield: LEVERAGED_FIXED_YIELD_CHECKLIST,
  yield_token_exposure: YIELD_TOKEN_EXPOSURE_CHECKLIST,
  liquidity_allocator: LIQUIDITY_ALLOCATOR_CHECKLIST,
  permissioned_vault: PERMISSIONED_VAULT_CHECKLIST,
  basic_amm_pool: BASIC_AMM_POOL_CHECKLIST,
  concentrated_liquidity_pool: CONCENTRATED_LIQUIDITY_POOL_CHECKLIST,
  hook_pool: HOOK_POOL_CHECKLIST,
  perp_exchange: PERP_EXCHANGE_CHECKLIST,
  option_vault: OPTION_VAULT_CHECKLIST,
  delta_neutral_vault: DELTA_NEUTRAL_VAULT_CHECKLIST,
  liquid_staking_token: LIQUID_STAKING_TOKEN_CHECKLIST,
  restaking_service: RESTAKING_SERVICE_CHECKLIST,
  liquid_restaking_token: LIQUID_RESTAKING_TOKEN_CHECKLIST,
  tokenized_security: TOKENIZED_SECURITY_CHECKLIST,
  private_credit_pool: PRIVATE_CREDIT_POOL_CHECKLIST,
  asset_backed_token: ASSET_BACKED_TOKEN_CHECKLIST,
  cover_pool: COVER_POOL_CHECKLIST,
  governance_stack: GOVERNANCE_STACK_CHECKLIST,
};

/** Every per-shape item for the shapes, lists one after another in table order. For ids and storage. */
export function checklistFor(shapes: ShapeInput): readonly ChecklistItem[] {
  return toShapeList(shapes).flatMap((s) => KIT_CHECKLISTS[s] ?? []);
}

type KitSteps = Pick<ProjectKit, "customSteps" | "hiddenSteps" | "features"> & Partial<Pick<ProjectKit, "ownShapes">>;

/** Every catalog step by id, across all our shapes (M176), for the steps an own shape picks. */
const ITEM_BY_ID = new Map<string, ChecklistItem>(Object.values(KIT_CHECKLISTS).flatMap((list) => (list ?? []).map((i) => [i.id, i] as const)));
export function checklistItemById(id: string): ChecklistItem | undefined {
  return ITEM_BY_ID.get(id);
}

/** Every catalog step of one of our shapes (M176), for copying it into an own shape. */
export function catalogStepIds(shape: ProductShape): string[] {
  return (KIT_CHECKLISTS[shape] ?? []).map((i) => i.id);
}

/**
 * One section per chosen shape with shared steps shown once (M43). What the
 * editor renders. With a kit, the steps gated by a feature it has not
 * ticked are left out (M64), the steps it removed are left out and the
 * steps it added sit at the end of their shape's section (M50). Without a
 * kit, every always-on step and no gated step.
 */
export function sectionsFor(shapes: ShapeInput, kit?: KitSteps): ProductSection[] {
  const base = withFeatureSteps(productSectionsFor(KIT_CHECKLISTS, SHARED_STEPS, shapes), kit);
  // The team's own shapes follow ours (M176), with the catalog steps they picked.
  return kit ? withKitSteps(withOwnShapes(base, kit.ownShapes ?? [], checklistItemById), kit) : base;
}

/** Every group across the chosen shapes, section order. Kit aware like sectionsFor. */
export function groupsFor(shapes: ShapeInput, kit?: KitSteps): StepGroup[] {
  return kit ? sectionsFor(shapes, kit).flatMap((s) => s.groups) : sectionsFor(shapes).flatMap((s) => s.groups);
}

/** The catalog steps a kit removed, by the shape whose section listed them (M50). */
export function removedGroupsFor(
  kit: (Pick<ProjectKit, "shape" | "shapes"> & KitSteps) | undefined,
): Map<ShapeId, StepGroup[]> {
  return removedGroups(withFeatureSteps(productSectionsFor(KIT_CHECKLISTS, SHARED_STEPS, kitShapes(kit)), kit), kit);
}

/** Every catalog step across the chosen shapes that is gated by a feature, with its id (M64). */
export function gatedStepsFor(shapes: ShapeInput): Array<{ id: string; title: string; feature: string }> {
  return checklistFor(shapes)
    .filter((i): i is ChecklistItem & { feature: string } => Boolean(i.feature))
    .map((i) => ({ id: i.id, title: i.title, feature: i.feature }));
}

/**
 * The one build progress number, shared steps counted once, removed steps
 * left out and added steps counted. Every surface (studio row, public page,
 * Review, pack, exports, MCP) calls this.
 */
export function buildProgress(
  kit: (Pick<ProjectKit, "shape" | "shapes" | "checklist" | "notApplicable"> & KitSteps) | undefined,
): {
  done: number;
  total: number;
} {
  return groupProgress(groupsFor(kitShapes(kit), kit ?? {}), kit);
}

assertChecklists(KIT_CHECKLISTS, KIT_CATALOG_IDS, TEMPLATE_CATALOG_IDS);
assertSharedSteps(KIT_CHECKLISTS, SHARED_STEPS);
