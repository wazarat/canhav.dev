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
const REVALIDATE_SECONDS = 86_400;

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
  try {
    const res = await fetch(PROTOCOLS_URL, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const json = (await res.json()) as RawProtocol[];
    return json
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
  } catch (err) {
    console.warn("[llama] protocols failed", err);
    return [];
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
  try {
    const res = await fetch(`https://api.llama.fi/protocol/${encodeURIComponent(slug)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    const json = (await res.json()) as { listedAt?: number };
    return typeof json.listedAt === "number" ? json.listedAt : null;
  } catch {
    return null;
  }
}

export function formatTvl(tvl: number): string {
  if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(1)}B`;
  if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(1)}M`;
  if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(0)}K`;
  return `$${tvl.toFixed(0)}`;
}
