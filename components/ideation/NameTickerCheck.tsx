"use client";

import { useEffect, useRef, useState } from "react";

import { StatusChip } from "@/components/ui/StatusChip";

interface CheckResult {
  indexerOk: boolean;
  chainMatches: Array<{ address: string; name: string; symbol: string }>;
  canhavMatches: Array<{ slug: string | null; name: string; ticker: string }>;
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
}: {
  designId: string;
  name: string;
  ticker: string;
}) {
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
  }, [active, nameTrim, ticker, designId]);

  if (!active || !result) return null;

  const label = [ticker.trim() && `"${ticker.trim()}"`, nameTrim && `"${nameTrim}"`]
    .filter(Boolean)
    .join(" and ");

  if (result.chainMatches.length === 0 && result.canhavMatches.length === 0) {
    return (
      <StatusChip tone="neutral" variant="block">
        {result.indexerOk
          ? `${label} not found on Robinhood Chain or CanHav.`
          : `${label} not found on CanHav. The Robinhood Chain check is unavailable right now.`}
      </StatusChip>
    );
  }

  return (
    <div className="space-y-2">
      {result.chainMatches.map((t) => (
        <StatusChip key={t.address} tone="warning" variant="block">
          Already in use on Robinhood Chain:{" "}
          <a
            href={`/launch/t/${t.address}`}
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            {t.name} (${t.symbol})
          </a>
          . Duplicates are legal on a permissionless chain, but buyers will
          have to tell them apart.
        </StatusChip>
      ))}
      {result.canhavMatches.map((m, i) => (
        <StatusChip key={`${m.slug ?? i}`} tone="warning" variant="block">
          A published CanHav design already uses this identity:{" "}
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
          The Robinhood Chain check is unavailable right now.
        </StatusChip>
      )}
    </div>
  );
}
