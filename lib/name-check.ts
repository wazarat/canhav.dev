import "server-only";

/**
 * The name and ticker check against the wider market (M116): CoinGecko's
 * search and DexScreener's search, both keyless, cached an hour. A warning
 * only, never a block; a failed upstream reads as no match.
 */
export interface ExternalMatch {
  source: "coingecko" | "dexscreener";
  name: string;
  symbol: string;
  url: string;
}

const REVALIDATE_SECONDS = 3600;
const MAX = 5;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

async function coingecko(name: string, ticker: string): Promise<ExternalMatch[]> {
  const q = name || ticker;
  if (!q) return [];
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const json = (await res.json()) as { coins?: Array<{ id: string; name: string; symbol: string; market_cap_rank?: number | null }> };
    return (json.coins ?? [])
      .filter((c) => (name && norm(c.name) === norm(name)) || (ticker && norm(c.symbol) === norm(ticker)))
      .slice(0, MAX)
      .map((c) => ({ source: "coingecko" as const, name: c.name, symbol: c.symbol.toUpperCase(), url: `https://www.coingecko.com/en/coins/${c.id}` }));
  } catch {
    return [];
  }
}

async function dexscreener(name: string, ticker: string): Promise<ExternalMatch[]> {
  const q = ticker || name;
  if (!q) return [];
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return [];
    const json = (await res.json()) as { pairs?: Array<{ url: string; baseToken: { name: string; symbol: string }; liquidity?: { usd?: number } }> };
    const seen = new Set<string>();
    return (json.pairs ?? [])
      .filter((p) => (name && norm(p.baseToken.name) === norm(name)) || (ticker && norm(p.baseToken.symbol) === norm(ticker)))
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
      .filter((p) => {
        const key = `${norm(p.baseToken.name)}|${norm(p.baseToken.symbol)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX)
      .map((p) => ({ source: "dexscreener" as const, name: p.baseToken.name, symbol: p.baseToken.symbol.toUpperCase(), url: p.url }));
  } catch {
    return [];
  }
}

/** Exact name or ticker matches on CoinGecko and DexScreener, a few at most. */
export async function externalNameMatches(name: string, ticker: string): Promise<ExternalMatch[]> {
  const n = name.trim().slice(0, 60);
  const t = ticker.trim().slice(0, 10);
  if (n.length < 3 && !t) return [];
  const [cg, ds] = await Promise.all([coingecko(n, t), dexscreener(n, t)]);
  return [...cg, ...ds].slice(0, MAX * 2);
}
