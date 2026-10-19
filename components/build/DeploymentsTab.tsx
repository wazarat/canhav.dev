"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { DeployerSection } from "@/components/build/DeployerSection";
import { KeysSection } from "@/components/build/KeysSection";
import { type CheckRunView, verifiedOn } from "@/lib/checks/schema";
import type { DeployerFunding } from "@/components/build/useDeployerBalances";
import { ContractRowsEditor } from "@/components/ideation/ContractRowsEditor";
import { MainnetEditor } from "@/components/ideation/MainnetEditor";
import { Card, CardSection } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { TESTNET_COPY } from "@/content/ideation";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { deployerView } from "@/lib/deployer";
import { explorerAddressUrl, explorerTokenUrl } from "@/lib/explorer";
import { type ProjectDoc, PROJECT_LIMITS, testnetContractRows } from "@/lib/ideation";
import { kitShapes } from "@/lib/kits";
import { templatesForShapes } from "@/lib/templates";

/** A token tied to the project, a launch or the linked design's deployment. */
export interface DeployedToken {
  address: string;
  name: string;
  symbol: string | null;
  /** ISO time when known. */
  launchedAt: string | null;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

/**
 * The Deployments tab (M96): one card for the project's chain. The testnet
 * contracts with the address book and the team wallet, the tokens launched
 * from or linked to the project, and the mainnet record with the Pons
 * pairing and the external pair.
 */
export function DeploymentsTab({
  id,
  doc,
  patch,
  setDoc,
  tokens,
  funding,
  checks = [],
}: {
  id: string;
  /** The newest automated check run per tool (M121). */
  checks?: CheckRunView[];
  doc: ProjectDoc;
  /** The deployer key's balances, polled by the page (M103). */
  funding: DeployerFunding;
  patch: (p: Partial<ProjectDoc>) => void;
  setDoc: (next: ProjectDoc) => void;
  tokens: DeployedToken[];
}) {
  const D = BUILD_COPY.deployments;
  const sourcify = checks.find((c) => c.tool === "sourcify") ?? null;
  const verifiedCount = testnetContractRows(doc).filter((r) => verifiedOn(r.address, checks) === "full" || verifiedOn(r.address, checks) === "partial").length;
  const chainKey = projectChainOf(doc);
  const chain = chainInfo(chainKey);
  const companionOptions = templatesForShapes(TEMPLATE_CATALOG, kitShapes(doc.kit), chainKey)
    .filter((t) => t.ponsFit && doc.kit?.templates?.[t.id] === "accepted")
    .map((t) => ({ value: t.id, label: t.name }));
  const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  const deployer = deployerView(doc, chainKey);
  const setDeployer = (address: string | null) => {
    if (address) patch({ deployer: address });
    else {
      const { deployer: _old, ...rest } = doc;
      setDoc(rest as ProjectDoc);
    }
  };

  return (
    <div className="max-w-2xl">
      <Card>
        <CardSection className="space-y-4">
          <Heading>{D.deployer.title}</Heading>
          <DeployerSection deployer={deployer} funding={funding} onAddress={setDeployer} />
        </CardSection>

        <CardSection className="space-y-4">
          <Heading>{BUILD_COPY.keys.title}</Heading>
          <KeysSection projectId={id} />
        </CardSection>

        <CardSection className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Heading>{D.testnet}</Heading>
            <StatusChip tone="neutral">{chain.name}</StatusChip>
          </div>
          {doc.githubSync ? (
            <p className="text-xs text-ink-400">
              {D.sync.line(doc.githubSync.sha.slice(0, 7), new Date(doc.githubSync.at).toLocaleDateString("en-US"), doc.githubSync.contracts, doc.githubSync.steps)}
              {doc.githubSync.outcome === "proposed" ? ` ${D.sync.proposed}` : ""}{" "}
              <a href={doc.githubSync.url} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                {D.sync.open}
              </a>
            </p>
          ) : (
            <p className="text-xs text-ink-500">{D.sync.none}</p>
          )}
          {sourcify ? (
            <p className="text-xs text-ink-400">
              {BUILD_COPY.checks.sourcify(verifiedCount, testnetContractRows(doc).length, new Date(sourcify.createdAt).toLocaleDateString("en-US"))}{" "}
              {sourcify.runUrl ? (
                <a href={sourcify.runUrl} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                  {BUILD_COPY.checks.open}
                </a>
              ) : null}
            </p>
          ) : null}
          <Field label={TESTNET_COPY.contractsLabel} info={TESTNET_COPY.contractsHint}>
            <ContractRowsEditor
              rows={testnetContractRows(doc)}
              onChange={(rows) => patch({ testnetContracts: rows.length ? rows : undefined })}
              max={PROJECT_LIMITS.testnetContracts.max}
              labelMax={PROJECT_LIMITS.mainnetLabel.max}
              copy={TESTNET_COPY}
              empty={() => ({ address: "" })}
            />
          </Field>
          {testnetContractRows(doc).some((c) => /^0x[0-9a-f]{40}$/i.test(c.address)) ? (
            <ul className="space-y-1 text-xs">
              {testnetContractRows(doc)
                .filter((c) => /^0x[0-9a-f]{40}$/i.test(c.address))
                .map((c) => (
                  <li key={c.address} className="flex flex-wrap items-center gap-2">
                    <span className="text-ink-300">{c.label || short(c.address)}</span>
                    <a
                      href={explorerAddressUrl(c.address, chainKey)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-electric-300 transition-colors hover:text-electric-200"
                    >
                      {short(c.address)} <ExternalLink aria-hidden className="h-3 w-3" />
                    </a>
                  </li>
                ))}
            </ul>
          ) : null}
          <Field label={TESTNET_COPY.addressBookLabel} info={TESTNET_COPY.addressBookHint}>
            <Input
              type="url"
              value={doc.addressBook ?? ""}
              onChange={(e) => patch({ addressBook: e.target.value.trim() || undefined })}
              placeholder="https://"
            />
          </Field>
          <Field label="Team wallet" info='Shown as "declared by team". Deploy history for this wallet renders on your public page.'>
            <Input
              value={doc.verifyWallet ?? ""}
              onChange={(e) => patch({ verifyWallet: e.target.value.trim().toLowerCase() || undefined })}
              placeholder="0x…"
              className="font-mono text-xs"
            />
          </Field>
        </CardSection>

        <CardSection className="space-y-3">
          <Heading>{D.tokens}</Heading>
          {tokens.length === 0 ? (
            <p className="text-xs text-ink-500">{D.tokensEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((t) => (
                <li key={t.address} className="flex flex-wrap items-center gap-3 text-sm">
                  <StatusChip tone="success">
                    {t.name}
                    {t.symbol ? ` $${t.symbol}` : ""}
                  </StatusChip>
                  <Link href={`/launch/t/${t.address}`} className="text-xs text-electric-300 transition-colors hover:text-electric-200">
                    {D.tokenPage}
                  </Link>
                  <a
                    href={explorerTokenUrl(t.address, chainKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-electric-300 transition-colors hover:text-electric-200"
                  >
                    {short(t.address)} <ExternalLink aria-hidden className="h-3 w-3" />
                  </a>
                  {t.launchedAt ? (
                    <span className="text-[11px] text-ink-500">{new Date(t.launchedAt).toLocaleDateString("en-US")}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardSection>

        <CardSection className="space-y-4">
          <Heading>{D.mainnet}</Heading>
          <MainnetEditor
            mainnet={doc.mainnet}
            chain={chainKey}
            companionOptions={companionOptions}
            onChange={(next) => {
              const { mainnet: _old, ...rest } = doc;
              setDoc(next ? { ...rest, mainnet: next } : (rest as ProjectDoc));
            }}
          />
        </CardSection>
      </Card>
    </div>
  );
}
