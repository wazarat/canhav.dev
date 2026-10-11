import { type ContractTemplate, assertTemplateCatalog } from "@/lib/templates";

import { CREDIT_TEMPLATES } from "./credit";
import { DERIVATIVES_TEMPLATES } from "./derivatives";
import { LIQUIDITY_TEMPLATES } from "./liquidity";
import { OTHER_TEMPLATES } from "./other";
import { RWA_TEMPLATES } from "./rwa";
import { STAKING_TEMPLATES } from "./staking";

/**
 * The whole contract template catalog (M61), one generated file per sector,
 * each entry in the file of its first placement. Regenerate with
 * `npm run gen:templates` after editing catalog.json; `npm run
 * check:templates` fails when the files drift. assertTemplateCatalog runs
 * at import and fails the build on a malformed entry.
 */
export const TEMPLATE_CATALOG: readonly ContractTemplate[] = [
  ...CREDIT_TEMPLATES,
  ...LIQUIDITY_TEMPLATES,
  ...DERIVATIVES_TEMPLATES,
  ...STAKING_TEMPLATES,
  ...RWA_TEMPLATES,
  ...OTHER_TEMPLATES,
];

/** The date the research catalog was generated, shown wherever the data is. */
export const TEMPLATE_CATALOG_GENERATED = "2026-10-11";

/** Old id to replacement id, or null to drop. Stored decisions keep meaning something. */
export const RETIRED_TEMPLATE_IDS: Record<string, string | null> = {};

export const TEMPLATE_CATALOG_IDS: ReadonlySet<string> = new Set(TEMPLATE_CATALOG.map((t) => t.id));

export const TEMPLATE_BY_ID: ReadonlyMap<string, ContractTemplate> = new Map(
  TEMPLATE_CATALOG.map((t) => [t.id, t] as const),
);

export function templateById(id: string): ContractTemplate | undefined {
  return TEMPLATE_BY_ID.get(RETIRED_TEMPLATE_IDS[id] ?? id);
}

assertTemplateCatalog(TEMPLATE_CATALOG, {
  credit_lending: CREDIT_TEMPLATES,
  liquidity_infra: LIQUIDITY_TEMPLATES,
  perps_derivatives: DERIVATIVES_TEMPLATES,
  staking: STAKING_TEMPLATES,
  rwa_infra: RWA_TEMPLATES,
  other: OTHER_TEMPLATES,
});
