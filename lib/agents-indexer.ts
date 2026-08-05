import "server-only";

/**
 * Data layer for the agents indexer (Ponder GraphQL API, indexer-agents/).
 * Separate from lib/indexer.ts by design — different indexer instance,
 * different chain, different env var; the ~15-line query helper is duplicated
 * rather than shared so neither track's data layer can drift into the other.
 * Every fetch degrades gracefully to null so /agents renders an "indexer
 * offline" state instead of crashing.
 */

const AGENTS_INDEXER_URL = process.env.AGENTS_INDEXER_URL ?? "http://localhost:42070";

export interface IndexedAgent {
  agentId: string;
  owner: string;
  /** Null when registered via the bare register() overload (no URI declared). */
  agentURI: string | null;
  registeredBlock: string;
  registeredAt: string;
  registeredTxHash: string;
  updatedAt: string;
}

const AGENT_FIELDS =
  "agentId owner agentURI registeredBlock registeredAt registeredTxHash updatedAt";

async function query<T>(gql: string): Promise<T | null> {
  try {
    const res = await fetch(`${AGENTS_INDEXER_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

/** Newest-first registrations, or null when the indexer is unreachable. */
export async function getAgents(limit = 20): Promise<IndexedAgent[] | null> {
  const n = Math.min(Math.max(1, Math.floor(limit)), 100);
  const data = await query<{ agents: { items: IndexedAgent[] } }>(
    `{ agents(orderBy: "registeredBlock", orderDirection: "desc", limit: ${n}) { items { ${AGENT_FIELDS} } } }`,
  );
  return data?.agents.items ?? null;
}

/** Single agent by id (decimal string), or null if unknown/offline. */
export async function getAgent(agentId: string): Promise<IndexedAgent | null> {
  if (!/^\d{1,78}$/.test(agentId)) return null;
  const data = await query<{ agent: IndexedAgent | null }>(
    `{ agent(agentId: "${agentId}") { ${AGENT_FIELDS} } }`,
  );
  return data?.agent ?? null;
}
