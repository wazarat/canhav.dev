import "server-only";

import { LLAMA_CATEGORIES, LLAMA_CHAIN, LLAMA_MIN_ROWS } from "@/content/competitors/llama-categories";
import type { ProjectChain } from "@/lib/chains";
import type { Subsector } from "@/lib/sectors";

/**
 * DefiLlama protocols for a subsector and chain (M114, M115). Keyless,
 * cached a day. Nothing here throws: an upstream failure answers an empty
 * list so a draft degrades to the record alone.
 */
export interface LlamaProtocol {
  name: string;
  slug: string;
  category: string;
  chains: string[];
  tvl: number;
  url: string | null;
  /** Unix seconds when DefiLlama first listed it, from /protocol/{slug}. */
  listedAt: number | null;
}

const PROTOCOLS_URL = "https://api.llama.fi/protocols";
const TTL_MS = 86_400_000;
// The protocol list is over 12 MB, past Next's fetch cache limit, so it is
// kept in module memory for a day instead; listing dates the same way.
let protocolsCache: { at: number; rows: LlamaProtocol[] } | null = null;
const listedAtCache = new Map<string, { at: number; value: number | null }>();

interface RawProtocol {
  name?: string;
  slug?: string;
  category?: string | null;
  chains?: string[];
  tvl?: number | null;
  url?: string | null;
  listedAt?: number | null;
}

export async function fetchLlamaProtocols(): Promise<LlamaProtocol[]> {
  if (protocolsCache && Date.now() - protocolsCache.at < TTL_MS) return protocolsCache.rows;
  try {
    const res = await fetch(PROTOCOLS_URL, { cache: "no-store" });
    if (!res.ok) return protocolsCache?.rows ?? [];
    const json = (await res.json()) as RawProtocol[];
    const rows = json
      .filter((p) => p.name && p.slug && typeof p.tvl === "number")
      .map((p) => ({
        name: p.name as string,
        slug: p.slug as string,
        category: p.category ?? "",
        chains: Array.isArray(p.chains) ? p.chains : [],
        tvl: p.tvl as number,
        url: p.url ?? null,
        listedAt: typeof p.listedAt === "number" ? p.listedAt : null,
      }));
    protocolsCache = { at: Date.now(), rows };
    return rows;
  } catch (err) {
    console.warn("[llama] protocols failed", err);
    return protocolsCache?.rows ?? [];
  }
}

/** The categories a project's subsectors map to, in order, without repeats. */
export function categoriesFor(subsectors: readonly Subsector[]): string[] {
  const out: string[] = [];
  for (const s of subsectors) for (const c of LLAMA_CATEGORIES[s] ?? []) if (!out.includes(c)) out.push(c);
  return out;
}

/**
 * Protocols in the given categories, on the project's chain when at
 * least LLAMA_MIN_ROWS are there, else on any chain. Largest first.
 */
export function pickProtocols(all: LlamaProtocol[], categories: readonly string[], chain: ProjectChain, limit = 40): { rows: LlamaProtocol[]; onChain: boolean } {
  if (categories.length === 0) return { rows: [], onChain: false };
  const inCategory = all.filter((p) => categories.includes(p.category));
  const chainName = LLAMA_CHAIN[chain];
  const onChain = inCategory.filter((p) => p.chains.includes(chainName));
  const picked = onChain.length >= LLAMA_MIN_ROWS ? onChain : inCategory;
  return { rows: [...picked].sort((a, b) => b.tvl - a.tvl).slice(0, limit), onChain: onChain.length >= LLAMA_MIN_ROWS };
}

/** The listing date of one protocol, for the positioning map's age axis. */
export async function fetchLlamaListedAt(slug: string): Promise<number | null> {
  const hit = listedAtCache.get(slug);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: number | null = null;
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { listedAt?: number };
      value = typeof json.listedAt === "number" ? json.listedAt : null;
    }
  } catch {
    value = null;
  }
  listedAtCache.set(slug, { at: Date.now(), value });
  return value;
}

export function formatTvl(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}
