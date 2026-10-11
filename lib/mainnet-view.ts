import { templateById } from "@/content/templates";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { mainnetAddressUrl } from "@/lib/explorer";
import { type MainnetRecord, type ProjectDoc, mainnetRecordEmpty } from "@/lib/ideation";

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
  };
}
