import { KIT_CHECKLISTS } from "@/content/kits/checklists";
import { TEMPLATE_CATALOG_IDS } from "@/content/templates";
import { type FeatureItem, type FeatureLists, type ProductShape, type ShapeInput, assertFeatures, toShapeList } from "@/lib/kits";

import { CREDIT_FEATURES } from "./credit";
import { DERIVATIVES_FEATURES } from "./derivatives";
import { LIQUIDITY_FEATURES } from "./liquidity";
import { RWA_FEATURES } from "./rwa";
import { STAKING_FEATURES } from "./staking";

/**
 * Features by shape (M64), what a product includes, as choices the team
 * ticks. A ticked feature shows the build steps that carry its id and
 * ranks the templates it suggests first. assertFeatures runs at import and
 * fails the build on a bad id, an unknown template or a checklist step
 * gated by a feature that is not declared.
 */
export const FEATURE_CATALOG: FeatureLists = {
  ...CREDIT_FEATURES,
  ...LIQUIDITY_FEATURES,
  ...DERIVATIVES_FEATURES,
  ...STAKING_FEATURES,
  ...RWA_FEATURES,
};

/** The features of the shapes, table order. */
export function featuresFor(shapes: ShapeInput): FeatureItem[] {
  return toShapeList(shapes).flatMap((s) => FEATURE_CATALOG[s as ProductShape] ?? []);
}

export const FEATURE_IDS: ReadonlySet<string> = new Set(
  Object.values(FEATURE_CATALOG).flatMap((l) => (l ?? []).map((f) => f.id)),
);

assertFeatures(FEATURE_CATALOG, KIT_CHECKLISTS, TEMPLATE_CATALOG_IDS);
