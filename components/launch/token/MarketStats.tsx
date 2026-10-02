import { TOKEN_PAGE_COPY } from "@/content/launch";

/** The four tiles over the chart (M58). Everything is in ETH, these are testnets. */
export function MarketStats({
  price,
  marketCap,
  depthLabel,
  depth,
  market,
}: {
  price: string;
  marketCap: string;
  depthLabel: string;
  depth: string;
  market: string;
}) {
  const C = TOKEN_PAGE_COPY.stats;
  const tiles = [
    [C.price, price],
    [C.marketCap, marketCap],
    [depthLabel, depth],
    [C.market, market],
  ];
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
      {tiles.map(([label, value]) => (
        <div key={label} className="md:border-l md:border-ink-800/70 md:pl-4 md:first:border-l-0 md:first:pl-0">
          <p className="text-xs text-ink-500">{label}</p>
          <p className="tabular mt-1 text-sm font-medium text-ink-50">{value}</p>
        </div>
      ))}
    </div>
  );
}
