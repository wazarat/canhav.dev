"use client";

import { CanvasEditor } from "@/components/build/CanvasEditor";
import { CompetitorsSection } from "@/components/build/CompetitorsSection";
import { IcpEditor } from "@/components/build/IcpEditor";
import { TAB_WIDTH } from "@/components/build/layout";
import { PlusGate } from "@/components/studio/PlusGate";
import { Card, CardSection } from "@/components/ui/Card";
import { BUILD_COPY } from "@/content/build";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

/**
 * The Business model tab (owner feedback 2026-10-19): the Studio+ market
 * work on its own tab instead of inside Decisions. The nine block canvas,
 * the ideal customer profiles and the competitor landscape, each behind
 * its feature gate for a free account.
 */
export function ModelTab({
  id,
  createdAt,
  agentMode,
  doc,
  patch,
}: {
  id: string;
  /** ISO time the project was started, for the project's age on the competitor map (M115). */
  createdAt: string;
  agentMode: AgentWriteMode;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
}) {
  const M = BUILD_COPY.model;
  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection id="model-canvas" className="space-y-4">
          <Heading>{M.canvas}</Heading>
          <PlusGate feature="bmc">
            <CanvasEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} canvas={doc.canvas} onChange={(canvas) => patch({ canvas })} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-icp" className="space-y-4">
          <Heading>{M.icp}</Heading>
          <p className="text-xs text-ink-500">{M.icpLead}</p>
          <PlusGate feature="icp">
            <IcpEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} profiles={doc.icp} onChange={(icp) => patch({ icp })} />
          </PlusGate>
        </CardSection>

        <CardSection id="model-competitors" className="space-y-4">
          <Heading>{M.competitors}</Heading>
          <PlusGate feature="competitors">
            <CompetitorsSection projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} createdAt={createdAt} value={doc.competitors} onChange={(competitors) => patch({ competitors })} />
          </PlusGate>
        </CardSection>
      </Card>
    </div>
  );
}
