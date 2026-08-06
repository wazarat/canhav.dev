import type { Metadata } from "next";

import { ConnectButton } from "@/components/agents/ConnectButton";
import { RegistryStatusCard } from "@/components/agents/RegistryStatusCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { AGENT_CHAIN, AGENT_CHAIN_ISSUE, AGENTS_COPY } from "@/content/agents";
import { getAgents } from "@/lib/agents-indexer";
import { formatAsOf } from "@/lib/format";

// Hidden like /launch: URL-only access, no nav links.
export const metadata: Metadata = {
  title: AGENTS_COPY.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** data: URIs are inlined registration files and can be kilobytes long. */
function describeURI(uri: string | null): string {
  if (!uri) return "No registration file declared";
  if (uri.startsWith("data:")) return "Inline registration file (data: URI)";
  return uri;
}

export default async function AgentsPage() {
  // Config broken → say exactly that and stop; every other section depends on
  // the registry address being trustworthy.
  if (AGENT_CHAIN_ISSUE) {
    return (
      <div className="container py-14 md:py-20">
        <p className="kicker">{AGENTS_COPY.kicker}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
          {AGENTS_COPY.title}
        </h1>
        <StatusChip variant="block" tone="error" className="mt-8 max-w-2xl rounded-2xl p-6 text-sm">
          <span className="block font-medium text-ink-100">Configuration error</span>
          <span className="mt-2 block leading-relaxed text-ink-300">{AGENT_CHAIN_ISSUE}</span>
        </StatusChip>
      </div>
    );
  }

  const agents = await getAgents(12);

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="kicker">{AGENTS_COPY.kicker}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">
            {AGENTS_COPY.title}
          </h1>
          <p className="mt-4 text-lg font-medium leading-relaxed text-ink-100">
            {AGENTS_COPY.subtitleLead}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            {AGENTS_COPY.subtitleDetail}
          </p>
        </div>
        <ConnectButton />
      </div>

      <div className="mt-10 grid gap-6 md:mt-12 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <RegistryStatusCard />

        <div>
          <h2 className="font-display text-xl font-semibold text-ink-50">
            Recent registrations
          </h2>
          <p className="mt-1 text-sm text-ink-400">
            Read from the on-chain event log on {AGENT_CHAIN.name}.
          </p>
          <div className="mt-4">
            {agents === null ? (
              <div className="glass rounded-2xl border border-ink-700/70 p-8 text-center">
                <p className="text-sm text-ink-300">
                  Indexer offline. Start it with{" "}
                  <code className="rounded bg-ink-900/80 px-1.5 py-0.5 font-mono text-xs text-ink-200">
                    cd indexer-agents && npm run dev
                  </code>
                </p>
              </div>
            ) : agents.length === 0 ? (
              <div className="glass rounded-2xl border border-ink-700/70 p-8 text-center">
                <p className="text-sm text-ink-300">No agents registered yet.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {agents.map((a) => (
                  <li
                    key={a.agentId}
                    className="card-surface rounded-2xl border border-ink-700/70 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={`${AGENT_CHAIN.explorerUrl}/token/${AGENT_CHAIN.identityRegistryAddress}/instance/${a.agentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-display text-base font-semibold text-ink-50 transition-colors hover:text-electric-200"
                      >
                        Agent #{a.agentId}
                      </a>
                      <span className="text-xs text-ink-500">
                        {formatAsOf(new Date(Number(a.registeredAt) * 1000).toISOString())}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                      <span className="text-ink-500">
                        Owner{" "}
                        <a
                          href={`${AGENT_CHAIN.explorerUrl}/address/${a.owner}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-ink-200 transition-colors hover:text-electric-200"
                        >
                          {shortAddress(a.owner)}
                        </a>
                      </span>
                      <span className="min-w-0 max-w-full truncate text-ink-400" title={a.agentURI ?? undefined}>
                        {describeURI(a.agentURI)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
