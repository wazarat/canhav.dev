import type { IndexedCurveTrade, IndexedSwap } from "@/lib/indexer";

/**
 * One market view over a token's two venues (M58). The bonding curve's
 * trades and, after graduation, the pool's swaps, as one newest-first list
 * and one price series. Prices are execution prices in ETH per whole token,
 * worked out from what each trade moved, since the indexer stores no price
 * history. Pure, so the server builds it and the client charts it.
 */

export interface TradeRow {
  side: "buy" | "sell";
  trader: string;
  ethWei: string;
  tokensWei: string;
  /** Snipe tax inside ethWei on a curve buy, "0" otherwise. */
  taxWei: string;
  /** Unix seconds. */
  timestamp: number;
  txHash: string;
  venue: "curve" | "pool";
  /** ETH per whole token, or null when the trade moved no tokens. */
  price: number | null;
}

export interface PricePoint {
  /** Unix seconds. */
  t: number;
  /** ETH per whole token. */
  p: number;
}

/** Both sides carry 18 decimals, so the ratio of wei is the price. */
function ratio(ethWei: bigint, tokensWei: bigint): number | null {
  if (tokensWei <= 0n || ethWei <= 0n) return null;
  return Number(ethWei) / Number(tokensWei);
}

export function tradeRows(
  curveTrades: IndexedCurveTrade[] | null | undefined,
  swaps: IndexedSwap[] | null | undefined,
): TradeRow[] {
  const rows: TradeRow[] = [];
  for (const t of curveTrades ?? []) {
    const eth = BigInt(t.ethWei);
    const tax = BigInt(t.taxWei);
    rows.push({
      side: t.side,
      trader: t.trader,
      ethWei: t.ethWei,
      tokensWei: t.tokensWei,
      taxWei: t.taxWei,
      timestamp: Number(t.blockTimestamp),
      txHash: t.txHash,
      venue: "curve",
      // The snipe tax is not part of the price the curve gave.
      price: ratio(t.side === "buy" ? eth - tax : eth, BigInt(t.tokensWei)),
    });
  }
  for (const s of swaps ?? []) {
    const ethWei = s.ethToToken ? s.amountIn : s.amountOut;
    const tokensWei = s.ethToToken ? s.amountOut : s.amountIn;
    rows.push({
      side: s.ethToToken ? "buy" : "sell",
      trader: s.trader,
      ethWei,
      tokensWei,
      taxWei: "0",
      timestamp: Number(s.blockTimestamp),
      txHash: s.txHash,
      venue: "pool",
      price: ratio(BigInt(ethWei), BigInt(tokensWei)),
    });
  }
  return rows.sort((a, b) => b.timestamp - a.timestamp);
}

/** Oldest first, for the chart. */
export function pricePoints(rows: TradeRow[]): PricePoint[] {
  return rows
    .filter((r) => r.price !== null)
    .map((r) => ({ t: r.timestamp, p: r.price as number }))
    .sort((a, b) => a.t - b.t);
}

/** ETH per whole token from reserves, or null when either side is empty. */
export function reservePrice(ethReserveWei: string, tokenReserveWei: string): number | null {
  return ratio(BigInt(ethReserveWei), BigInt(tokenReserveWei));
}

/** Whole tokens from a wei supply. */
export function wholeTokens(supplyWei: string): number {
  return Number(BigInt(supplyWei) / 10n ** 18n);
}

/** A small ETH figure for tiles and axes. "3.12e-11", "0.0312", "4.2". */
export function formatEthAmount(eth: number | null): string {
  if (eth === null || !Number.isFinite(eth)) return "n/a";
  if (eth === 0) return "0";
  if (Math.abs(eth) < 0.000001) return eth.toExponential(2);
  return String(Number(eth.toPrecision(4)));
}
