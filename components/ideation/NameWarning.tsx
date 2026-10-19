"use client";

import { useEffect, useRef, useState } from "react";

import { NAME_CHECK_COPY } from "@/content/ideation";

interface External {
  source: "coingecko" | "dexscreener";
  name: string;
  symbol: string;
  url: string;
}

/**
 * The market name check (M116): exact matches on CoinGecko and DexScreener
 * for a name and ticker, as plain text under the field, a warning that
 * never blocks. Debounced, aborted on change, silent on failure.
 */
export function NameWarning({ name, ticker = "" }: { name: string; ticker?: string }) {
  const [matches, setMatches] = useState<External[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const n = name.trim();
  const t = ticker.trim();
  const active = n.length >= 3 || t.length > 0;

  useEffect(() => {
    if (!active) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({ name: n, ticker: t });
        const res = await fetch(`/api/ideation/name-check?${params}`, { signal: controller.signal });
        if (!res.ok) return;
        const body = (await res.json()) as { external?: External[] };
        setMatches(body.external ?? []);
      } catch {
        // aborted or offline, keep the last answer
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [active, n, t]);

  if (!active || matches.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs text-ink-400">
      {matches.map((m) => (
        <li key={`${m.source}-${m.url}`}>
          {NAME_CHECK_COPY.listed(m.name, m.symbol, NAME_CHECK_COPY.sources[m.source])}{" "}
          <a href={m.url} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
            {NAME_CHECK_COPY.open}
          </a>
        </li>
      ))}
      <li className="text-ink-500">{NAME_CHECK_COPY.note}</li>
    </ul>
  );
}
