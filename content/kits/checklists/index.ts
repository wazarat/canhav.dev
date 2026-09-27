import { KIT_CATALOG_IDS } from "@/content/kits/catalog";
import { type ChecklistItem, type ProductShape, type ShapeInput, assertChecklists, toShapeList } from "@/lib/kits";

import {
  COLLATERAL_LOANS_CHECKLIST,
  CURATED_VAULT_CHECKLIST,
  EMBEDDED_EARN_CHECKLIST,
} from "./lending";

/**
 * Build checklists by shape. Fixed income and leveraged yield lists arrive in
 * M31. assertChecklists runs at import and fails the build on a duplicate
 * id or a reference to a resource that is not in the catalog.
 */
export const KIT_CHECKLISTS: Partial<Record<ProductShape, readonly ChecklistItem[]>> = {
  curated_vault: CURATED_VAULT_CHECKLIST,
  embedded_earn: EMBEDDED_EARN_CHECKLIST,
  collateral_loans: COLLATERAL_LOANS_CHECKLIST,
};

/** The steps for one shape or, for several, their lists one after another in table order. */
export function checklistFor(shapes: ShapeInput): readonly ChecklistItem[] {
  return toShapeList(shapes).flatMap((s) => KIT_CHECKLISTS[s] ?? []);
}

assertChecklists(KIT_CHECKLISTS, KIT_CATALOG_IDS);
