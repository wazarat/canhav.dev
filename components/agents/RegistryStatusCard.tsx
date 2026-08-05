import { parseAbi } from "viem";

import { AGENT_CHAIN } from "@/content/agents";
import { agentsPublicClient } from "@/lib/agentsPublicClient";

const abi = parseAbi(["function name() view returns (string)"]);

/**
 * Server component: proves the env-configured registry is live with two RPC
 * reads (chain id + ERC-721 name). Degrades to an explicit error card — a
 * wrong RPC or dead address must be visible, not blank.
 */
export async function RegistryStatusCard() {
  let chainId: number | null = null;
  let name: string | null = null;
  let rpcError = false;
  try {
    [chainId, name] = await Promise.all([
      agentsPublicClient.getChainId(),
      agentsPublicClient.readContract({
        address: AGENT_CHAIN.identityRegistryAddress,
        abi,
        functionName: "name",
      }),
    ]);
  } catch {
    rpcError = true;
  }

  const chainOk = chainId === AGENT_CHAIN.chainId;
  const nameOk = name === "AgentIdentity";

  return (
    <div className="glass rounded-2xl border border-ink-700/70 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
        Identity Registry
      </p>
      {rpcError ? (
        <p className="mt-3 text-sm text-rose-400">
          RPC unreachable — could not read the registry. Check AGENTS_RPC_URL.
        </p>
      ) : (
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-500">Network</dt>
            <dd className={chainOk ? "text-ink-200" : "text-rose-400"}>
              {chainOk
                ? `${AGENT_CHAIN.name} (${chainId})`
                : `RPC serves chain ${chainId}, expected ${AGENT_CHAIN.chainId}`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-500">Contract</dt>
            <dd className={nameOk ? "text-ink-200" : "text-rose-400"}>
              {nameOk ? `${name} (live)` : `name() = ${JSON.stringify(name)}, expected "AgentIdentity"`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-500">Address</dt>
            <dd>
              <a
                href={`${AGENT_CHAIN.explorerUrl}/address/${AGENT_CHAIN.identityRegistryAddress}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-electric-300 transition-colors hover:text-electric-200"
              >
                {AGENT_CHAIN.identityRegistryAddress.slice(0, 10)}…
                {AGENT_CHAIN.identityRegistryAddress.slice(-4)}
              </a>
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
