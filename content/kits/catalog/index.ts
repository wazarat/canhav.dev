import { type KitResource, assertKitCatalog } from "@/lib/kits";

import { BOROS_RESOURCES } from "./boros";
import { MORPHO_RESOURCES } from "./morpho";
import { PENDLE_RESOURCES } from "./pendle";
import { ROBINHOOD_RESOURCES } from "./robinhood";
import { SHARED_RESOURCES } from "./shared";
import { UNISWAP_RESOURCES } from "./uniswap";

/**
 * The whole catalog, one file per family, serving the credit and liquidity kits. Ids are immutable once
 * shipped; a rename or removal goes through RETIRED_IDS so stored
 * selections keep meaning something. assertKitCatalog runs at import and
 * fails the build on a duplicate or malformed entry.
 */
export const KIT_CATALOG: readonly KitResource[] = [
  ...SHARED_RESOURCES,
  ...ROBINHOOD_RESOURCES,
  ...MORPHO_RESOURCES,
  ...PENDLE_RESOURCES,
  ...UNISWAP_RESOURCES,
  ...BOROS_RESOURCES,
];

/** Old id to replacement id, or null to drop. */
export const RETIRED_IDS: Record<string, string | null> = {};

export const KIT_CATALOG_IDS: ReadonlySet<string> = new Set(KIT_CATALOG.map((r) => r.id));

assertKitCatalog(KIT_CATALOG, {
  shared: SHARED_RESOURCES,
  robinhood: ROBINHOOD_RESOURCES,
  morpho: MORPHO_RESOURCES,
  pendle: PENDLE_RESOURCES,
  uniswap: UNISWAP_RESOURCES,
  boros: BOROS_RESOURCES,
});
