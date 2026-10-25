"use client";

import { CanvasEditor } from "@/components/build/CanvasEditor";
import { CompetitorsSection } from "@/components/build/CompetitorsSection";
import { IcpEditor } from "@/components/build/IcpEditor";
import { ProspectsTable } from "@/components/build/ProspectsTable";
import { ValueCanvasEditor } from "@/components/build/ValueCanvasEditor";
import { InvestorPackSection } from "@/components/build/InvestorPackSection";
import { TAB_WIDTH } from "@/components/build/layout";
import { PlusGate, usePlusHere } from "@/components/studio/PlusGate";
import { itemVerdicts } from "@/lib/experiments";
import { Card, CardSection } from "@/components/ui/Card";
import { BUILD_COPY } from "@/content/build";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

/**
 * The Business model tab (owner feedback 2026-10-19): the Studio+ market
 * work on its own tab instead of inside Decisions. The nine block canvas,
 * the ideal customer profiles, the competitor landscape and, since M143,
 * the investor and grant pack, each behind its feature gate.
 */
export function ModelTab({
  id,
  createdAt,
  agentMode,
  doc,
  patch,
  token,
}: {
  id: string;
  /** ISO time the project was started, for the project's age on the competitor map (M115). */
  createdAt: string;
  agentMode: AgentWriteMode;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  /** The launched or linked token, for the pack prompt (M159). */
  token?: { name: string; symbol: string | null; address: string } | null;
}) {
  const M = BUILD_COPY.model;
  // The verdicts experiments gave the items and the Test this links (M170, M171), for a session with Viability.
  const viability = usePlusHere("viability").ok;
  const verdicts = itemVerdicts(doc.experiments);
  const testCanvas = viability ? (itemId: string) => `?tab=viability&experiment=new&assumption=canvas:${itemId}` : undefined;
  const testValue = viability ? (key: string, itemId: string) => `?tab=viability&experiment=new&assumption=value:${key}:${itemId}` : undefined;
  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection id="model-canvas" className="space-y-4">
          <Heading>{M.canvas}</Heading>
          <PlusGate feature="bmc">
            <CanvasEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} canvas={doc.canvas} onChange={(canvas) => patch({ canvas })} verdicts={verdicts} testHref={testCanvas} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-icp" className="space-y-4">
          <Heading>{M.icp}</Heading>
          <p className="text-xs text-ink-500">{M.icpLead}</p>
          <PlusGate feature="icp">
            <IcpEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} profiles={doc.icp} onChange={(icp) => patch({ icp })} reach={doc.reach} hasAssets={Boolean(doc.assets?.length)} onReach={(reach) => patch({ reach })} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-prospects" className="space-y-4">
          <Heading>{M.prospects}</Heading>
          <PlusGate feature="icp">
            <ProspectsTable projectId={id} profiles={doc.icp} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-value" className="space-y-4">
          <Heading>{M.valueCanvas}</Heading>
          <PlusGate feature="icp">
            <ValueCanvasEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} profiles={doc.icp} value={doc.valueCanvas} onChange={(valueCanvas) => (valueCanvas ? patch({ valueCanvas }) : patch({ valueCanvas: undefined }))} differentiator={doc.competitors?.differentiator} verdicts={verdicts} testHref={testValue} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-competitors" className="space-y-4">
          <Heading>{M.competitors}</Heading>
          <PlusGate feature="competitors">
            <CompetitorsSection projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} createdAt={createdAt} value={doc.competitors} onChange={(competitors) => patch({ competitors })} profiles={doc.icp} valueCanvas={doc.valueCanvas} onValueCanvas={(valueCanvas) => patch({ valueCanvas })} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-pack" className="space-y-4">
          <Heading>{STUDIO_PLUS_COPY.pack.title}</Heading>
          <InvestorPackSection projectId={id} doc={doc} patch={patch} agentMode={agentMode} token={token} />
        </CardSection>
      </Card>
    </div>
  );
}
