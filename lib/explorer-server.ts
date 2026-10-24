import { launchChain } from "@/content/launch";
import type { ProjectChain } from "@/lib/chains";
import { DEPLOYER_ADDRESS } from "@/lib/deployer";

/**
 * Reads from the testnet explorers (M149). Both testnets run Blockscout,
 * whose v2 API answers `/api/v2/addresses/<address>` with the creator of a
 * contract. Used to offer the address that deployed a recorded contract as
 * the project's deployer (P1), so the record stops contradicting the
 * deploys that happened. Any non JSON or missing answer reads as unknown;
 * answers are cached in memory for five minutes.
 */
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: string | null }>();

export async function contractCreator(address: string, chain: ProjectChain): Promise<string | null> {
  const key = `${chain}:${address.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: string | null = null;
  try {
    const res = await fetch(`${launchChain(chain).explorerUrl}/api/v2/addresses/${address.toLowerCase()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { is_contract?: unknown; creator_address_hash?: unknown };
      const creator = typeof json.creator_address_hash === "string" ? json.creator_address_hash.toLowerCase() : "";
      if (json.is_contract === true && DEPLOYER_ADDRESS.test(creator)) value = creator;
    }
  } catch {
    value = null;
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}
