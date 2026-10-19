import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TesterForm } from "@/app/test/[token]/TesterForm";
import { Card, CardSection } from "@/components/ui/Card";
import { BUILD_COPY } from "@/content/build";
import { PROJECT_CHAIN_INFO, projectChainOf } from "@/lib/chains";
import { explorerAddressUrl } from "@/lib/explorer";
import { testnetContractRows } from "@/lib/ideation";
import { getPublicInvite } from "@/lib/tester-db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicInvite(token);
  return { title: data ? `Test ${data.project.name}` : "Tester invite", robots: { index: false, follow: false } };
}

/**
 * The tester page (M125): no sign in, reached by the invite link. The
 * project, the chain and its faucet, the contracts, then the steps with a
 * short form each. A closed invite says so and takes nothing.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicInvite(token);
  if (!data) notFound();
  const T = BUILD_COPY.tester.page;
  const chainKey = projectChainOf(data.project.doc);
  const chain = PROJECT_CHAIN_INFO[chainKey];
  const contracts = testnetContractRows(data.project.doc);
  const open = data.state === "open";
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div className="space-y-2">
        <p className="text-xs text-ink-400">{T.kicker}</p>
        <h1 className="font-display text-2xl font-semibold text-ink-50">{data.project.name || T.untitled}</h1>
        {data.project.doc.whatItDoes ? <p className="text-sm leading-relaxed text-ink-300">{data.project.doc.whatItDoes}</p> : null}
        <p className="text-xs text-ink-400">
          {data.invite.label} · {chain.name}
          {data.project.doc.website ? (
            <>
              {" · "}
              <a href={data.project.doc.website} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                {T.website}
              </a>
            </>
          ) : null}
        </p>
      </div>

      <Card>
        <CardSection className="space-y-2">
          <h2 className="font-display text-base font-semibold text-ink-50">{T.setup}</h2>
          <p className="text-sm text-ink-300">
            {T.faucetLine(chain.name)}{" "}
            <a href={chain.faucetUrl} target="_blank" rel="noreferrer" className="text-ink-100 hover:underline">
              {T.faucet}
            </a>
          </p>
          {contracts.length ? (
            <ul className="space-y-1 text-xs text-ink-300">
              {contracts.map((c) => (
                <li key={c.address} className="flex flex-wrap items-center gap-2">
                  {c.label ? <span className="text-ink-200">{c.label}</span> : null}
                  <a href={explorerAddressUrl(c.address, chainKey)} target="_blank" rel="noreferrer" className="font-mono text-ink-300 hover:underline">
                    {c.address}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-500">{T.noContracts}</p>
          )}
        </CardSection>
      </Card>

      {open ? (
        <TesterForm token={token} steps={data.invite.steps} />
      ) : (
        <Card>
          <CardSection>
            <p className="text-sm text-ink-300">{T.closed[data.state]}</p>
          </CardSection>
        </Card>
      )}
      <p className="text-xs text-ink-500">{T.footer}</p>
    </main>
  );
}
