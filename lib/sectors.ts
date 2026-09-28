/**
 * Sectors and subsectors of a project, shared by lib/ideation.ts (the
 * document) and lib/kits.ts (the research kit) so neither imports the other's
 * values. No Node imports, no `server-only`.
 *
 * A project has one or more sectors since M32 (2026-09-28). `sectors` is the
 * list and `sector` stays as its first entry so every older reader, snapshot
 * and MCP consumer keeps working, the same pattern as a kit's `shape` and
 * `shapes`. Each sector owns its subsectors; a shape may belong to subsectors
 * of different sectors, which is how one product can be reached from two
 * sectors (see SHAPE_SUBSECTORS in lib/kits.ts).
 */

export type Sector =
  | "credit_lending"
  | "staking"
  | "liquidity_infra"
  | "perps_derivatives"
  | "rwa_infra"
  | "other";

export const SECTOR_VALUES: readonly Sector[] = [
  "credit_lending",
  "staking",
  "liquidity_infra",
  "perps_derivatives",
  "rwa_infra",
  "other",
];

export type Subsector = "lending" | "leveraged_yield" | "fixed_income" | "vaults" | "pools";

/** The one place subsector ownership lives. Key order is display order. */
export const SECTOR_SUBSECTORS: Record<Sector, readonly Subsector[]> = {
  credit_lending: ["lending", "leveraged_yield", "fixed_income"],
  staking: [],
  liquidity_infra: ["vaults", "pools"],
  perps_derivatives: [],
  rwa_infra: [],
  other: [],
};

export const SUBSECTOR_VALUES: readonly Subsector[] = SECTOR_VALUES.flatMap(
  (s) => SECTOR_SUBSECTORS[s],
);

/** Sectors that ask for subsectors, in SECTOR_VALUES order. */
export const SECTORS_WITH_SUBSECTORS: readonly Sector[] = SECTOR_VALUES.filter(
  (s) => SECTOR_SUBSECTORS[s].length > 0,
);

const SECTOR_OF: Record<Subsector, Sector> = Object.fromEntries(
  SECTOR_VALUES.flatMap((s) => SECTOR_SUBSECTORS[s].map((sub) => [sub, s] as const)),
) as Record<Subsector, Sector>;

export function sectorOfSubsector(sub: Subsector): Sector {
  return SECTOR_OF[sub];
}

/**
 * Retired sector ids from the eleven-sector list and the label they carried,
 * so an old doc lands on "other" with its sectorOther back-filled instead of
 * rendering "Not set".
 */
export const LEGACY_SECTOR_MAP: Record<string, string> = {
  underwriting_risk: "Underwriting and risk",
  oracles_data: "Oracles and data",
  agentic_trading: "Agentic trading",
  stablecoin_payments: "Stablecoin and payments",
  portfolio_vaults: "Portfolio and vaults",
  dex_market_structure: "DEX and market structure",
};

/** The sectors a document declares, in table order. Reads `sectors` and falls back to `sector`. */
export function docSectors(doc: { sector: Sector | ""; sectors?: readonly Sector[] }): Sector[] {
  if (doc.sectors?.length) return [...doc.sectors];
  return doc.sector ? [doc.sector] : [];
}

/** The field patch for a new set of sectors. Deduplicated, in table order, `sector` first. */
export function withSectors(input: readonly Sector[]): { sectors: Sector[]; sector: Sector | "" } {
  const chosen = new Set(input);
  const sectors = SECTOR_VALUES.filter((s) => chosen.has(s));
  return { sectors, sector: sectors[0] ?? "" };
}

/** The subsectors that belong to any of the given sectors, in table order. */
export function subsectorsOf(sectors: readonly Sector[]): Subsector[] {
  const chosen = new Set(sectors);
  return SUBSECTOR_VALUES.filter((sub) => chosen.has(sectorOfSubsector(sub)));
}
