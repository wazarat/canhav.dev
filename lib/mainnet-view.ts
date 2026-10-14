import { pairVenueLabel } from "@/content/launch-targets";
import { templateById } from "@/content/templates";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { mainnetAddressUrl } from "@/lib/explorer";
import { type MainnetRecord, type ProjectDoc, mainnetRecordEmpty } from "@/lib/ideation";
import type { PairVenue } from "@/lib/launch-targets";

/**
 * The mainnet record of a project as every read surface shows it (M70):
 * the launch panel, the public page, the exports and the MCP project
 * blocks. Pure over the document. Null when the project records nothing.
 */
export interface MainnetView {
  chain: ProjectChain;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  contracts: Array<{ label: string; address: string; url: string }>;
  companion: { id: string; name: string; ponsFit: string | null } | null;
  pons: { tokenAddress: string; tokenUrl: string; feeRecipient: string; feeUrl: string } | null;
  /** The external trading pair the team recorded (M78), null when none. */
  pair: MainnetPairView | null;
}

export interface MainnetPairView {
  venue: PairVenue;
  venueLabel: string;
  quoteAsset: string;
  /** Explorer link when the quote asset is an address, else null. */
  quoteUrl: string | null;
  pairAddress: string | null;
  /** Explorer link for the pair contract when recorded. */
  pairUrl: string | null;
  /** Where to trade. */
  url: string;
}

export function mainnetView(doc: Pick<ProjectDoc, "chain" | "mainnet">): MainnetView | null {
  const m: MainnetRecord | undefined = doc.mainnet;
  if (!m || mainnetRecordEmpty(m)) return null;
  const chain = projectChainOf(doc);
  const info = chainInfo(chain);
  const companion = m.companionTemplate ? templateById(m.companionTemplate) : undefined;
  return {
    chain,
    chainId: m.chainId,
    chainName: info.mainnetName,
    explorerUrl: info.mainnetExplorerUrl,
    contracts: m.contracts.map((c) => ({ label: c.label, address: c.address, url: mainnetAddressUrl(c.address, chain) })),
    companion: m.companionTemplate
      ? { id: m.companionTemplate, name: companion?.name ?? m.companionTemplate, ponsFit: companion?.ponsFit ?? null }
      : null,
    pons: m.pons
      ? {
          tokenAddress: m.pons.tokenAddress,
          tokenUrl: mainnetAddressUrl(m.pons.tokenAddress, chain),
          feeRecipient: m.pons.feeRecipient,
          feeUrl: mainnetAddressUrl(m.pons.feeRecipient, chain),
        }
      : null,
    pair: m.pair
      ? {
          venue: m.pair.venue,
          venueLabel: pairVenueLabel(m.pair.venue),
          quoteAsset: m.pair.quoteAsset,
          quoteUrl: m.pair.quoteAsset.startsWith("0x") ? mainnetAddressUrl(m.pair.quoteAsset, chain) : null,
          pairAddress: m.pair.pairAddress ?? null,
          pairUrl: m.pair.pairAddress ? mainnetAddressUrl(m.pair.pairAddress, chain) : null,
          url: m.pair.url,
        }
      : null,
  };
}
