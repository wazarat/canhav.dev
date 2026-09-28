import { KIT_CATALOG_IDS } from "@/content/kits/catalog";
import { type ChecklistItem, type ProductShape, type ShapeInput, assertChecklists, toShapeList } from "@/lib/kits";

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

/** The steps for one shape or, for several, their lists one after another in table order. */
export function checklistFor(shapes: ShapeInput): readonly ChecklistItem[] {
  return toShapeList(shapes).flatMap((s) => KIT_CHECKLISTS[s] ?? []);
}

assertChecklists(KIT_CHECKLISTS, KIT_CATALOG_IDS);
