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
/** Where the key lives when the project records nothing else (M138): the .env of the contracts package. */
export const DEPLOYER_ENV_FILE_DEFAULT = ".env";

/** The env file the project records, or the default. */
export function deployerEnvFile(doc: { deployerEnvFile?: string }): string {
  const v = doc.deployerEnvFile?.trim();
  return v || DEPLOYER_ENV_FILE_DEFAULT;
}

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
  /** The project's chain (M148): the funding row that leads; the other testnet folds away. */
  projectChain: ProjectChain;
  envVar: string;
  /** The env file path relative to the repository root (M138). */
  envFile: string;
  /** True while the project records no path of its own. */
  envFileDefault: boolean;
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

export function deployerView(doc: { deployer?: string; deployerEnvFile?: string; chain?: unknown }, projectChain: ProjectChain): DeployerView | null {
  const address = doc.deployer?.trim().toLowerCase();
  if (!address || !DEPLOYER_ADDRESS.test(address)) return null;
  return { address, projectChain, envVar: DEPLOYER_ENV, envFile: deployerEnvFile(doc), envFileDefault: !doc.deployerEnvFile?.trim(), chains: deployerChains(projectChain) };
}

/** The line that goes into the env file. The key never leaves the machine it was made on. */
export function deployerEnvLine(privateKey: string): string {
  return `${DEPLOYER_ENV}=${privateKey}`;
}

/** What an agent reads when the project has no deployer key yet (M138): the file follows the repository's layout. */
export function deployerHint(doc: { deployerEnvFile?: string } = {}): string {
  const file = deployerEnvFile(doc);
  const where = doc.deployerEnvFile?.trim()
    ? `write it to ${file} as ${DEPLOYER_ENV}=0x...`
    : `write it to the .env of the contracts package as ${DEPLOYER_ENV}=0x... (packages/contracts/.env in a monorepo, .env beside foundry.toml otherwise) and record that path with update_project deployerEnvFile`;
  return (
    `No deployer key is recorded. Generate a throwaway key in the repository (cast wallet new, or viem's generatePrivateKey), ` +
    `${where}, never send the key here, and record its address with update_project deployer. ` +
    `The owner funds the address from each testnet's faucet; the balances show on get_project_status.`
  );
}

/** The hint for a project that records no path, kept for callers without a document. */
export const DEPLOYER_HINT = deployerHint();
