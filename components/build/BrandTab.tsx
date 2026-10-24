"use client";

import { BrandEditor } from "@/components/build/BrandEditor";
import { TAB_WIDTH } from "@/components/build/layout";
import { PlusGate } from "@/components/studio/PlusGate";
import { Card, CardSection } from "@/components/ui/Card";
import { BUILD_COPY } from "@/content/build";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";

/** The Brand tab (owner feedback 2026-10-19): the brand kit on its own tab, gated for a free account. */
export function BrandTab({ id, agentMode, doc, patch }: { id: string; agentMode: AgentWriteMode; doc: ProjectDoc; patch: (p: Partial<ProjectDoc>) => void }) {
  const B = BUILD_COPY.brandTab;
  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection id="brand-kit" className="space-y-4">
          <h2 className="font-display text-base font-semibold text-ink-50">{B.title}</h2>
          <p className="text-xs text-ink-500">{B.lead}</p>
          <PlusGate feature="brand">
            <BrandEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} brand={doc.brand} hasLogo={Boolean(doc.logo)} onChange={(brand) => patch({ brand })} />
          </PlusGate>
        </CardSection>
      </Card>
    </div>
  );
}
