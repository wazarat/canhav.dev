import { PROJECT_CHAINS, type ProjectChain, chainInfo } from "@/lib/chains";
import { launchChain } from "@/content/launch";

/**
 * The project's throwaway deployer key (M102). CanHav never holds the
 * private key: it is generated in the owner's browser or by the agent in
 * the repository, pasted into the contracts package's env file, and only
 * the address is stored on the project. One key serves both testnets,
 * since both are EVM chains with the same address space. Pure, shared by
 * the studio, the MCP tools and the exports.
 */
export const DEPLOYER_ENV = "DEPLOYER_PRIVATE_KEY";
export const DEPLOYER_ENV_FILE = "packages/contracts/.env";

export const DEPLOYER_ADDRESS = /^0x[0-9a-f]{40}$/;

export interface DeployerChainView {
  chain: ProjectChain;
  chainId: number;
  name: string;
  faucetUrl: string;
  explorerUrl: string;
}

export interface DeployerView {
  /** Lowercase hex. */
  address: string;
  envVar: string;
  envFile: string;
  chains: DeployerChainView[];
}

/** The chains a deployer key is funded on, the project's chain first. */
export function deployerChains(projectChain: ProjectChain): DeployerChainView[] {
  const order = [projectChain, ...PROJECT_CHAINS.filter((c) => c !== projectChain)];
  return order.map((chain) => {
    const info = chainInfo(chain);
    return {
      chain,
      chainId: info.chainId,
      name: info.name,
      faucetUrl: info.faucetUrl,
      explorerUrl: `${launchChain(chain).explorerUrl}/address/`,
    };
  });
}

export function deployerView(doc: { deployer?: string; chain?: unknown }, projectChain: ProjectChain): DeployerView | null {
  const address = doc.deployer?.trim().toLowerCase();
  if (!address || !DEPLOYER_ADDRESS.test(address)) return null;
  return { address, envVar: DEPLOYER_ENV, envFile: DEPLOYER_ENV_FILE, chains: deployerChains(projectChain) };
}

/** The line that goes into the env file. The key never leaves the machine it was made on. */
export function deployerEnvLine(privateKey: string): string {
  return `${DEPLOYER_ENV}=${privateKey}`;
}

/** What an agent reads when the project has no deployer key yet. */
export const DEPLOYER_HINT =
  `No deployer key is recorded. Generate a throwaway key in the repository (cast wallet new, or viem's generatePrivateKey), ` +
  `write it to ${DEPLOYER_ENV_FILE} as ${DEPLOYER_ENV}=0x..., never send the key here, and record its address with update_project deployer. ` +
  `The owner funds the address from each testnet's faucet; the balances show on get_project_status.`;
