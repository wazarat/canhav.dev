import { ORACLE_DIRECTORY_ABSENT, ORACLE_FEEDS, ORACLES_CHECKED_ON, type OracleFeed, type OracleNetwork } from "@/content/chains/oracles";
import { type ProjectChain, chainInfo } from "@/lib/chains";

/**
 * Feed lookups over the committed oracle list (M162). Pure, client and
 * server. A project chain maps to its testnet directory and the mainnet
 * directory it stands in for; `feedsFor` answers both so the dependency
 * check can say available, mainnet only or missing.
 */
export function oracleNetworksOf(chain: ProjectChain): { testnet: OracleNetwork; mainnet: OracleNetwork } {
  return chainInfo(chain).family === "robinhood"
    ? { testnet: "robinhood_testnet", mainnet: "robinhood_mainnet" }
    : { testnet: "arbitrum_sepolia", mainnet: "arbitrum_one" };
}

/** The USD price feed of an asset on a network, else its first feed of any quote, else null. */
export function findFeed(symbol: string, network: OracleNetwork): OracleFeed | null {
  const s = symbol.trim().toUpperCase();
  const feeds = ORACLE_FEEDS[network].filter((f) => f.asset === s);
  return feeds.find((f) => f.kind === "price" && f.quote === "USD") ?? feeds[0] ?? null;
}

export function feedsFor(symbol: string, chain: ProjectChain): { testnet: OracleFeed | null; mainnet: OracleFeed | null; testnetDirectoryAbsent: boolean; checkedOn: string } {
  const nets = oracleNetworksOf(chain);
  return { testnet: findFeed(symbol, nets.testnet), mainnet: findFeed(symbol, nets.mainnet), testnetDirectoryAbsent: ORACLE_DIRECTORY_ABSENT[nets.testnet], checkedOn: ORACLES_CHECKED_ON };
}

/** How many tokenized equity feeds the mainnet directory lists, the stock token fact for the chain section. */
export function equityFeedCount(chain: ProjectChain): number {
  return ORACLE_FEEDS[oracleNetworksOf(chain).mainnet].filter((f) => f.assetClass === "equity").length;
}
