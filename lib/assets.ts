import { z } from "zod";

import { isItemId, newItemId } from "@/lib/canvas-items";

/**
 * The assets an idea depends on (M162, Studio+ under viability): the
 * tokens the contracts touch, each with a role, so the dependency check
 * can ask for a price feed and onchain liquidity per asset. Filled by the
 * agent from the code or by the team. Rows carry an id (the canvas item
 * id shape) and a provenance stamp set by the server on the path that
 * recorded the row, never accepted from outside. Pure, client and server.
 */
export const ASSET_ROLES = ["collateral", "borrow", "quote", "underlying", "reward"] as const;
export type AssetRole = (typeof ASSET_ROLES)[number];

export const ASSET_RECORDED_BY = ["agent", "owner"] as const;
export type AssetRecordedBy = (typeof ASSET_RECORDED_BY)[number];

export interface AssetEntry {
  id: string;
  /** Upper case ticker, 1 to 12 characters. */
  symbol: string;
  role: AssetRole;
  /** Lowercase hex, the token on the project's chain or its mainnet. Optional. */
  address?: string;
  recordedBy?: AssetRecordedBy;
  /** ISO time the row was first recorded. */
  recordedAt?: string;
}

export const ASSET_LIMITS = { max: 20, symbol: { min: 1, max: 12 } } as const;

const ADDRESS = /^0x[0-9a-f]{40}$/;
const SYMBOL = /^[A-Z0-9.$_-]{1,12}$/;

export function isAssetRole(v: unknown): v is AssetRole {
  return typeof v === "string" && (ASSET_ROLES as readonly string[]).includes(v);
}

function isRecordedBy(v: unknown): v is AssetRecordedBy {
  return typeof v === "string" && (ASSET_RECORDED_BY as readonly string[]).includes(v);
}

/** A symbol as stored: trimmed, upper cased, cut to the limit. Empty when nothing usable is left. */
export function cleanSymbol(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim().toUpperCase().slice(0, ASSET_LIMITS.symbol.max);
  return SYMBOL.test(s) ? s : "";
}

/**
 * Assets as stored: a valid unused id is kept and any other regenerated,
 * the symbol is upper cased, a row without a usable symbol or role drops,
 * an address is lowercased and dropped when malformed, a known stamp and
 * a parseable time survive, the list is capped. Idempotent on its own
 * output.
 */
export function normalizeAssets(raw: unknown): AssetEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: AssetEntry[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const symbol = cleanSymbol(o.symbol);
    if (!symbol || !isAssetRole(o.role)) continue;
    let id = isItemId(o.id) && !seen.has(o.id) ? o.id : newItemId();
    while (seen.has(id)) id = newItemId();
    seen.add(id);
    const address = typeof o.address === "string" && ADDRESS.test(o.address.trim().toLowerCase()) ? o.address.trim().toLowerCase() : undefined;
    const recordedBy = isRecordedBy(o.recordedBy) ? o.recordedBy : undefined;
    const recordedAt = typeof o.recordedAt === "string" && o.recordedAt.length <= 40 && !Number.isNaN(Date.parse(o.recordedAt)) ? o.recordedAt : undefined;
    out.push({ id, symbol, role: o.role, ...(address ? { address } : {}), ...(recordedBy ? { recordedBy } : {}), ...(recordedAt ? { recordedAt } : {}) });
    if (out.length >= ASSET_LIMITS.max) break;
  }
  return out;
}

/**
 * Provenance (the M150 rule): a row whose id is already stored keeps its
 * stamp, including none; a new row is stamped with `by` and now. Stamps
 * sent from outside are dropped. Pure; the agent apply and the studio
 * call it.
 */
export function stampAssets(stored: readonly AssetEntry[], incoming: readonly AssetEntry[], by: AssetRecordedBy, now = new Date().toISOString()): AssetEntry[] {
  const known = new Map(stored.map((r) => [r.id, r] as const));
  return incoming.map((r) => {
    const { recordedBy: _b, recordedAt: _a, ...rest } = r;
    const cur = known.get(r.id);
    if (cur) return { ...rest, ...(cur.recordedBy ? { recordedBy: cur.recordedBy } : {}), ...(cur.recordedAt ? { recordedAt: cur.recordedAt } : {}) };
    return { ...rest, recordedBy: by, recordedAt: now };
  });
}

/** What update_project accepts (no stamps, an optional id to edit a row in place). The list replaces the stored list. */
export const assetInputSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]{4,12}$/).optional(),
  symbol: z.string().min(ASSET_LIMITS.symbol.min).max(ASSET_LIMITS.symbol.max),
  role: z.enum(ASSET_ROLES),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/).optional(),
});
export const assetsPatchSchema = z.array(assetInputSchema).max(ASSET_LIMITS.max);

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** One asset as a line for the agent feed and the exports: "USDG, collateral, 0x5fc5…d168". */
export function assetLine(a: Pick<AssetEntry, "symbol" | "role" | "address">): string {
  return [a.symbol, a.role, a.address ? shortAddress(a.address) : ""].filter(Boolean).join(", ");
}
