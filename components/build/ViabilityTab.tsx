"use client";

import { useState } from "react";

import { AssetsEditor } from "@/components/build/AssetsEditor";
import { DependenciesSection } from "@/components/build/DependenciesSection";
import { EconomicsSection } from "@/components/build/EconomicsSection";
import { ExperimentsSection } from "@/components/build/ExperimentsSection";
import { GapMapSection } from "@/components/build/GapMap";
import { ViabilitySummary, type SummaryLine } from "@/components/build/ViabilitySummary";
import { TAB_WIDTH } from "@/components/build/layout";
import { PlusGate } from "@/components/studio/PlusGate";
import { Card, CardSection } from "@/components/ui/Card";
import { VIABILITY_COPY } from "@/content/viability";
import { agentRequestsFull, findAgentRequest, withAgentRequest, withoutAgentRequest } from "@/lib/agent-requests";
import { assetsPrompt } from "@/lib/agent-prompts";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { stampAssets } from "@/lib/assets";
import type { ProjectDoc } from "@/lib/ideation";
import { type ProjectKit, effectiveSubsectors } from "@/lib/kits";
import { projectChainOf } from "@/lib/chains";
import { breakEvenSentence } from "@/lib/economics";
import { dueLine, isOverdue } from "@/lib/experiments";

/** The section ids the summary links to and the sidebar scrolls to. */
export const VIABILITY_SECTIONS = ["dependencies", "gaps", "economics", "experiments"] as const;
export type ViabilitySection = (typeof VIABILITY_SECTIONS)[number];
export const viabilitySectionId = (s: ViabilitySection | "summary") => `viability-${s}`;

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

/**
 * The Viability tab (M162, Studio+): whether the idea can work on its
 * chain. A summary on top, then Can it be built here, What is live on
 * this chain, Do the numbers work and Experiments, each opening with the
 * sentence that answers its question. This milestone lays the tab out
 * with the assets the dependency check reads; the sections fill in
 * through M171.
 */
export function ViabilityTab({
  id,
  doc,
  patch,
  setDoc,
  onPatchKit,
  agentMode,
  agentConnected,
  token,
}: {
  id: string;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  setDoc: (doc: ProjectDoc) => void;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  agentMode: AgentWriteMode;
  /** An agent has worked on the project (a session or a change exists). */
  agentConnected: boolean;
  /** The launched or linked token, for onchain evidence (M171). */
  token?: { address: string } | null;
}) {
  const V = VIABILITY_COPY;
  const [dependencyLine, setDependencyLine] = useState<string | null>(null);
  const [gapLine, setGapLine] = useState<string | null>(null);
  const lines: SummaryLine[] = [];
  if (dependencyLine) lines.push({ section: viabilitySectionId("dependencies"), text: dependencyLine });
  if (gapLine) lines.push({ section: viabilitySectionId("gaps"), text: gapLine });
  if (doc.economics && doc.economics.family !== "governance") lines.push({ section: viabilitySectionId("economics"), text: breakEvenSentence(doc.economics) });
  const running = (doc.experiments ?? []).filter((e) => e.status === "running");
  if (doc.experiments?.length) {
    const next = [...running].filter((e) => e.deadline).sort((a, b) => a.deadline.localeCompare(b.deadline))[0];
    lines.push({ section: viabilitySectionId("experiments"), text: V.experiments.summary(running.length, running.filter((e) => isOverdue(e)).length, next ? dueLine(next.deadline) : null) });
  }
  const assetsRequest = findAgentRequest(doc, "assets");
  const dropRequest = () => {
    const left = withoutAgentRequest(doc, "assets");
    if (left) patch({ agentRequests: left });
    else {
      const { agentRequests: _r, ...rest } = doc;
      setDoc(rest as ProjectDoc);
    }
  };
  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection id={viabilitySectionId("summary")} className="space-y-3">
          <Heading>{V.summary.title}</Heading>
          <p className="text-xs text-ink-500">{V.lead}</p>
          <PlusGate feature="viability">
            <ViabilitySummary lines={lines} />
          </PlusGate>
        </CardSection>

        <CardSection id={viabilitySectionId("dependencies")} className="space-y-4">
          <Heading>{V.sections.dependencies.title}</Heading>
          <p className="text-xs text-ink-500">{V.sections.dependencies.question}</p>
          <PlusGate feature="viability">
            <DependenciesSection
              projectId={id}
              assets={doc.assets ?? []}
              kit={doc.kit}
              onPatchKit={onPatchKit}
              onSummary={setDependencyLine}
              assetsEditor={
                <AssetsEditor
                  assets={doc.assets ?? []}
                  onChange={(rows) => {
                    const stamped = stampAssets(doc.assets ?? [], rows, "owner");
                    if (stamped.length) patch({ assets: stamped });
                    else {
                      const { assets: _a, ...rest } = doc;
                      setDoc(rest as ProjectDoc);
                    }
                  }}
                  prompt={assetsPrompt(doc.name, id)}
                  canQueue={agentConnected && agentMode !== "off"}
                  full={agentRequestsFull(doc) && !assetsRequest}
                  queuedAt={assetsRequest?.requestedAt}
                  onQueue={() => patch({ agentRequests: withAgentRequest(doc, "assets") })}
                  onCancelQueue={dropRequest}
                />
              }
            />
          </PlusGate>
        </CardSection>

        <CardSection id={viabilitySectionId("gaps")} className="space-y-3">
          <Heading>{V.sections.gaps.title}</Heading>
          <p className="text-xs text-ink-500">{V.sections.gaps.question}</p>
          <PlusGate feature="viability">
            <GapMapSection projectId={id} chain={projectChainOf(doc)} yourSubsectors={effectiveSubsectors(doc.kit, doc)} onSummary={setGapLine} />
          </PlusGate>
        </CardSection>

        <CardSection id={viabilitySectionId("economics")} className="space-y-3">
          <Heading>{V.sections.economics.title}</Heading>
          <p className="text-xs text-ink-500">{V.sections.economics.question}</p>
          <PlusGate feature="viability">
            <EconomicsSection projectId={id} doc={doc} patch={patch} />
          </PlusGate>
        </CardSection>

        <CardSection id={viabilitySectionId("experiments")} className="space-y-3">
          <Heading>{V.sections.experiments.title}</Heading>
          <p className="text-xs text-ink-500">{V.sections.experiments.question}</p>
          <PlusGate feature="viability">
            <ExperimentsSection projectId={id} doc={doc} patch={patch} setDoc={setDoc} agentMode={agentMode} agentConnected={agentConnected} token={token} />
          </PlusGate>
        </CardSection>
      </Card>
    </div>
  );
}
