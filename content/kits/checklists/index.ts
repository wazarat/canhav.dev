import { KIT_CATALOG_IDS } from "@/content/kits/catalog";
import {
  type ChecklistItem,
  type ProductShape,
  type ProductSection,
  type ProjectKit,
  type ShapeInput,
  type StepGroup,
  assertChecklists,
  assertSharedSteps,
  groupProgress,
  kitShapes,
  productSectionsFor,
  stepGroupsFor,
  toShapeList,
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

/**
 * Build checklists by shape, all thirteen. assertChecklists runs at import and
 * fails the build on a duplicate id or a reference to a resource that is
 * not in the catalog.
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
};

/** Every per-shape item for the shapes, lists one after another in table order. For ids and storage. */
export function checklistFor(shapes: ShapeInput): readonly ChecklistItem[] {
  return toShapeList(shapes).flatMap((s) => KIT_CHECKLISTS[s] ?? []);
}

/** One section per chosen shape with shared steps shown once (M43). What the editor renders. */
export function sectionsFor(shapes: ShapeInput): ProductSection[] {
  return productSectionsFor(KIT_CHECKLISTS, SHARED_STEPS, shapes);
}

/** Every group across the chosen shapes, section order. */
export function groupsFor(shapes: ShapeInput): StepGroup[] {
  return stepGroupsFor(KIT_CHECKLISTS, SHARED_STEPS, shapes);
}

/**
 * The one build progress number, shared steps counted once. Every surface
 * (studio row, public page, Review, pack, exports, MCP) calls this.
 */
export function buildProgress(kit: Pick<ProjectKit, "shape" | "shapes" | "checklist"> | undefined): {
  done: number;
  total: number;
} {
  return groupProgress(groupsFor(kitShapes(kit)), kit);
}

assertChecklists(KIT_CHECKLISTS, KIT_CATALOG_IDS);
assertSharedSteps(KIT_CHECKLISTS, SHARED_STEPS);
