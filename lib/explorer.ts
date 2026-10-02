import { launchChain } from "@/content/launch";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";

/**
 * Blockscout URL builders, one explorer per chain (M54). Single home for the
 * explorer link patterns. The chain defaults to Robinhood, where every token
 * from before M54 lives; pass the token's chain wherever it is known.
 */

export function explorerAddressUrl(address: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): string {
  return `${launchChain(chain).explorerUrl}/address/${address}`;
}

export function explorerTxUrl(hash: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): string {
  return `${launchChain(chain).explorerUrl}/tx/${hash}`;
}

export function explorerTokenUrl(address: string, chain: ProjectChain = DEFAULT_PROJECT_CHAIN): string {
  return `${launchChain(chain).explorerUrl}/token/${address}`;
}
