import { z } from "zod";

/**
 * Ideal customer profiles (M114): one or two, with the wallets, channels
 * and protocols they use, the trigger that makes them buy and the
 * objection they raise. Pure.
 */
export interface Icp {
  name: string;
  summary: string;
  walletsTheyUse: string[];
  channels: string[];
  protocolsTheyUse: string[];
  buyingTrigger: string;
  objection: string;
}

export const ICP_LIMITS = {
  profiles: { max: 2 },
  name: { max: 60 },
  summary: { max: 400 },
  short: { max: 200 },
  list: { max: 8, item: 60 },
} as const;

const line = (max: number) => z.string().max(max);
const list = z.array(z.string().min(1).max(ICP_LIMITS.list.item)).max(ICP_LIMITS.list.max);

export const icpSchema = z.object({
  name: line(ICP_LIMITS.name.max),
  summary: line(ICP_LIMITS.summary.max),
  walletsTheyUse: list,
  channels: list,
  protocolsTheyUse: list,
  buyingTrigger: line(ICP_LIMITS.short.max),
  objection: line(ICP_LIMITS.short.max),
});

export const icpListSchema = z.array(icpSchema).max(ICP_LIMITS.profiles.max);

/** What the model answers: no length caps, normalizeIcp cuts to the limits afterwards. */
export const icpDraftSchema = z.object({
  profiles: z.array(
    z.object({ name: z.string(), summary: z.string(), walletsTheyUse: z.array(z.string()), channels: z.array(z.string()), protocolsTheyUse: z.array(z.string()), buyingTrigger: z.string(), objection: z.string() }),
  ),
});

export function emptyIcp(): Icp {
  return { name: "", summary: "", walletsTheyUse: [], channels: [], protocolsTheyUse: [], buyingTrigger: "", objection: "" };
}

function cleanList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, ICP_LIMITS.list.item))
    .filter(Boolean)
    .slice(0, ICP_LIMITS.list.max);
}

/** Profiles as stored: trimmed and capped, empty ones dropped; null when nothing survives. */
export function normalizeIcp(raw: unknown): Icp[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Icp[] = [];
  for (const r of raw.slice(0, ICP_LIMITS.profiles.max)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const str = (k: string, max: number) => (typeof o[k] === "string" ? (o[k] as string).trim().slice(0, max) : "");
    const p: Icp = {
      name: str("name", ICP_LIMITS.name.max),
      summary: str("summary", ICP_LIMITS.summary.max),
      walletsTheyUse: cleanList(o.walletsTheyUse),
      channels: cleanList(o.channels),
      protocolsTheyUse: cleanList(o.protocolsTheyUse),
      buyingTrigger: str("buyingTrigger", ICP_LIMITS.short.max),
      objection: str("objection", ICP_LIMITS.short.max),
    };
    if (p.name || p.summary || p.walletsTheyUse.length || p.channels.length || p.protocolsTheyUse.length || p.buyingTrigger || p.objection) out.push(p);
  }
  return out.length ? out : null;
}

/** A comma separated field as a list, the editor's way in. */
export function listFromText(text: string): string[] {
  return cleanList(text.split(",").map((s) => s.trim()));
}
