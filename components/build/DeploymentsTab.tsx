"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { DeployerSection } from "@/components/build/DeployerSection";
import { GithubSetupCard } from "@/components/build/GithubSetupCard";
import { AlertsSection } from "@/components/build/AlertsSection";
import { AnalyticsSection } from "@/components/build/AnalyticsSection";
import { KeysSection } from "@/components/build/KeysSection";
import { TAB_WIDTH } from "@/components/build/layout";
import { usePlan } from "@/components/studio/PlanContext";
import { useProjectPlan } from "@/components/studio/ProjectPlanContext";
import { TeamSafeCard } from "@/components/build/TeamSafeCard";
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
import { findAgentRequest, withAgentRequest, withoutAgentRequest } from "@/lib/agent-requests";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { deployerView } from "@/lib/deployer";
import { explorerAddressUrl, explorerTokenUrl } from "@/lib/explorer";
import { type ProjectDoc, PROJECT_LIMITS, type TestnetContract, stampContracts, testnetContractRows } from "@/lib/ideation";
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
  contractProvenance = {},
  agentMode = "propose",
  agentConnected = false,
}: {
  id: string;
  /** The agent write mode and whether an agent has worked on the project (M151). */
  agentMode?: AgentWriteMode;
  agentConnected?: boolean;
  /** The newest automated check run per tool (M121). */
  checks?: CheckRunView[];
  /** Address to ISO time from the agent change history (M150), for rows recorded before stamps existed. */
  contractProvenance?: Record<string, string>;
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
  // Where a recorded contract came from (M150): the row's stamp, else the earliest agent change that carried it, else recorded earlier.
  const provenanceLine = (row: TestnetContract): string => {
    const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (row.recordedBy) return D.contracts.recordedBy[row.recordedBy](row.recordedAt ? day(row.recordedAt) : "");
    const at = contractProvenance[row.address.toLowerCase()];
    if (at) return D.contracts.recordedBy.agent(day(at));
    return D.contracts.recordedEarlier;
  };

  const deployer = deployerView(doc, chainKey);
  // Recording the address here stamps it as the owner's and answers an open ask (M151); clearing drops both keys.
  const setDeployer = (address: string | null) => {
    if (address) {
      const left = withoutAgentRequest(doc, "deployer");
      const { agentRequests: _r, ...rest } = doc;
      setDoc({ ...(rest as ProjectDoc), deployer: address, deployerBy: "owner", ...(left ? { agentRequests: left } : {}) });
    } else {
      const { deployer: _old, deployerBy: _by, ...rest } = doc;
      setDoc(rest as ProjectDoc);
    }
  };
  const askAgent = () => patch({ agentRequests: withAgentRequest(doc, "deployer") });
  const cancelAsk = () => {
    const left = withoutAgentRequest(doc, "deployer");
    if (left) patch({ agentRequests: left });
    else {
      const { agentRequests: _r, ...rest } = doc;
      setDoc(rest as ProjectDoc);
    }
  };

  // Studio+ sections show for a Studio+ session only (M136).
  const paid = usePlan().plan === "studio_plus";
  // The team Safe needs the project's team and its plan (M160).
  const plan = useProjectPlan();
  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection className="space-y-4">
          <Heading>{D.deployer.title}</Heading>
          <DeployerSection
            projectId={id}
            projectName={doc.name}
            deployer={deployer}
            agentMode={agentMode}
            agentConnected={agentConnected}
            request={findAgentRequest(doc, "deployer") ?? null}
            onAsk={askAgent}
            onCancelAsk={cancelAsk}
            deployerBy={doc.deployerBy}
            funding={funding}
            onAddress={setDeployer}
            envFile={doc.deployerEnvFile ?? ""}
            onEnvFile={(v) => patch({ deployerEnvFile: v.trim() ? v : undefined })}
            contracts={testnetContractRows(doc)}
          />
        </CardSection>

        {paid ? (
          <CardSection id="project-keys" className="scroll-mt-24 space-y-4">
            <Heading>{BUILD_COPY.keys.title}</Heading>
            <KeysSection projectId={id} />
          </CardSection>
        ) : null}

        {paid ? (
          <CardSection id="github-setup" className="scroll-mt-24 space-y-4">
            <Heading>{D.setup.title}</Heading>
            <GithubSetupCard projectId={id} doc={doc} checks={checks} />
          </CardSection>
        ) : null}

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
          ) : null}
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
          <p className="max-w-3xl text-xs leading-relaxed text-ink-400">{D.contracts.intro}</p>
          <Field label={TESTNET_COPY.contractsLabel} info={TESTNET_COPY.contractsHint}>
            <ContractRowsEditor
              rows={testnetContractRows(doc)}
              onChange={(rows) => patch({ testnetContracts: rows.length ? stampContracts(testnetContractRows(doc), rows, "owner") : undefined })}
              max={PROJECT_LIMITS.testnetContracts.max}
              labelMax={PROJECT_LIMITS.mainnetLabel.max}
              copy={TESTNET_COPY}
              empty={() => ({ address: "" })}
              linkFor={(a) => explorerAddressUrl(a, chainKey)}
              meta={(row) => provenanceLine(row)}
            />
          </Field>
          <Field label={TESTNET_COPY.addressBookLabel} info={TESTNET_COPY.addressBookHint}>
            <Input
              type="url"
              value={doc.addressBook ?? ""}
              onChange={(e) => patch({ addressBook: e.target.value.trim() || undefined })}
              placeholder="https://"
            />
          </Field>
          {plan.plus && plan.orgId ? (
            <div className="space-y-3">
              <h3 className="font-display text-sm font-semibold text-ink-50">{D.teamSafe.title}</h3>
              <TeamSafeCard
                projectId={id}
                chain={chainKey}
                teamSafe={doc.teamSafe}
                onChange={(teamSafe) => {
                  if (teamSafe) patch({ teamSafe });
                  else {
                    const { teamSafe: _old, ...rest } = doc;
                    setDoc(rest as ProjectDoc);
                  }
                }}
              />
            </div>
          ) : null}
          <Field label={doc.teamSafe ? D.teamSafe.declaredLabel : D.teamSafe.teamWalletLabel} info={doc.teamSafe ? D.teamSafe.declaredInfo : D.teamSafe.teamWalletInfo}>
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

        {paid ? (
          <CardSection className="space-y-4">
            <Heading>{BUILD_COPY.analytics.title}</Heading>
            <AnalyticsSection projectId={id} tokens={tokens} />
          </CardSection>
        ) : null}

        {paid ? (
          <CardSection className="space-y-4">
            <Heading>{BUILD_COPY.alerts.title}</Heading>
            <AlertsSection projectId={id} contracts={testnetContractRows(doc)} tokens={tokens} />
          </CardSection>
        ) : null}

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
