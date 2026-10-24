"use client";

import { useEffect, useRef, useState } from "react";

import { StatusChip } from "@/components/ui/StatusChip";
import { NAME_CHECK_COPY } from "@/content/ideation";
import { type ProjectChain, chainInfo } from "@/lib/chains";

interface CheckResult {
  indexerOk: boolean;
  chainMatches: Array<{ address: string; name: string; symbol: string }>;
  canhavMatches: Array<{ slug: string | null; name: string; ticker: string }>;
  /** The wider market (M116). */
  external?: Array<{ source: "coingecko" | "dexscreener"; name: string; symbol: string; url: string }>;
}

/**
 * Live identity check for the Supply step: exact matches against deployed
 * factory tokens and published CanHav designs. Informational only, never
 * gates publish, and never says "available": an indexer can only prove
 * presence, not absence, across a permissionless chain.
 */
export function NameTickerCheck({
  designId,
  name,
  ticker,
  chain,
}: {
  designId: string;
  name: string;
  ticker: string;
  /** The chain the design launches on (M139), the linked project's or the default. */
  chain: ProjectChain;
}) {
  const mainnet = chainInfo(chain).mainnetName;
  const [result, setResult] = useState<CheckResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const nameTrim = name.trim();
  const active = ticker.trim().length > 0 || nameTrim.length >= 3;

  useEffect(() => {
    if (!active) {
      setResult(null);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({
          name: nameTrim,
          ticker: ticker.trim(),
          exclude: designId,
          chain,
        });
        const res = await fetch(`/api/ideation/name-check?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        setResult((await res.json()) as CheckResult);
      } catch {
        // aborted or offline; keep the last result
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [active, nameTrim, ticker, designId, chain]);

  if (!active || !result) return null;

  const label = [ticker.trim() && `"${ticker.trim()}"`, nameTrim && `"${nameTrim}"`]
    .filter(Boolean)
    .join(" and ");

  if (result.chainMatches.length === 0 && result.canhavMatches.length === 0) {
    return (
      <div className="space-y-2">
        <StatusChip tone="neutral" variant="block">
          {result.indexerOk ? NAME_CHECK_COPY.notFound(label, mainnet) : NAME_CHECK_COPY.notFoundUnavailable(label, mainnet)}
        </StatusChip>
        {external(result)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {result.chainMatches.map((t) => (
        <StatusChip key={t.address} tone="warning" variant="block">
          {NAME_CHECK_COPY.inUse(mainnet)}{" "}
          <a
            href={`/launch/t/${t.address}`}
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            {t.name} (${t.symbol})
          </a>
          {NAME_CHECK_COPY.inUseTail}
        </StatusChip>
      ))}
      {result.canhavMatches.map((m, i) => (
        <StatusChip key={`${m.slug ?? i}`} tone="warning" variant="block">
          A published CanHav design already uses this identity. See{" "}
          {m.slug ? (
            <a
              href={`/t/${m.slug}`}
              className="text-electric-300 transition-colors hover:text-electric-200"
            >
              {m.name} (${m.ticker})
            </a>
          ) : (
            `${m.name} ($${m.ticker})`
          )}
          .
        </StatusChip>
      ))}
      {!result.indexerOk && (
        <StatusChip tone="neutral" variant="block">
          {NAME_CHECK_COPY.unavailable(mainnet)}
        </StatusChip>
      )}
      {external(result)}
    </div>
  );
}

/** Exact matches on CoinGecko and DexScreener, plain text, never blocking (M116). */
function external(result: CheckResult) {
  const list = result.external ?? [];
  if (list.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs text-ink-400">
      {list.map((m) => (
        <li key={`${m.source}-${m.url}`}>
          {NAME_CHECK_COPY.listed(m.name, m.symbol, NAME_CHECK_COPY.sources[m.source])}{" "}
          <a href={m.url} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
            {NAME_CHECK_COPY.open}
          </a>
        </li>
      ))}
    </ul>
  );
}
