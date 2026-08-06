import { LAUNCH_CHAIN } from "@/content/launch";

/**
 * Blockscout URL builders for Robinhood Chain Testnet. Single home for the
 * explorer link patterns that were previously inline template literals.
 */

export function explorerAddressUrl(address: string): string {
  return `${LAUNCH_CHAIN.explorerUrl}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${LAUNCH_CHAIN.explorerUrl}/tx/${hash}`;
}

export function explorerTokenUrl(address: string): string {
  return `${LAUNCH_CHAIN.explorerUrl}/token/${address}`;
}
