"use client";

import { AgentFeed } from "@/components/build/AgentFeed";
import { ResourcesLine } from "@/components/build/ResourcesLine";
import type { AgentChangesHandle } from "@/components/build/useAgentChanges";
import { McpConnectCard } from "@/components/launch/McpConnectCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardSection } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { STAGE_OPTIONS, optionLabel } from "@/content/ideation";
import { shapeLabels } from "@/content/kits/copy";
import { buildProgress } from "@/content/kits/checklists";
import { chainInfo, projectChainOf } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import type { ProjectKit } from "@/lib/kits";

const ONE_LINE = 140;

function oneLine(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= ONE_LINE) return t;
  return `${t.slice(0, ONE_LINE).replace(/\s+\S*$/, "")}…`;
}

/**
 * The Overview tab (M94): what the project is in one strip, the agent
 * (session, mode, proposals), how to connect one, the resource pack
 * behind a line, then the token design and launch panels the page passes
 * in.
 */
export function OverviewTab({
  id,
  doc,
  kit,
  hasKit,
  agent,
  paused,
  onPatchKit,
  linkPanel,
}: {
  id: string;
  doc: ProjectDoc;
  kit: ProjectKit | undefined;
  hasKit: boolean;
  agent: AgentChangesHandle;
  paused: boolean;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** The token design link, the launch panel and the MCP card, rendered by the server page. */
  linkPanel?: React.ReactNode;
}) {
  const chain = chainInfo(projectChainOf(doc));
  const progress = buildProgress(kit);
  const shapes = shapeLabels(kit);
  const line = oneLine(doc.whatItDoes);
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardSection className="space-y-3">
          {line ? <p className="text-sm leading-relaxed text-ink-200">{line}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            {shapes.map((s) => (
              <Badge key={s} tone="neon">
                {s}
              </Badge>
            ))}
            <Badge>{chain.short}</Badge>
            {doc.stage ? <Badge>{optionLabel(STAGE_OPTIONS, doc.stage)}</Badge> : null}
            {progress.total ? (
              <StatusChip tone={progress.done === progress.total ? "success" : "neutral"}>
                {BUILD_COPY.overview.progress(progress.done, progress.total)}
              </StatusChip>
            ) : null}
          </div>
          {!kit?.shape ? <p className="text-xs text-ink-500">{BUILD_COPY.overview.noShape}</p> : null}
        </CardSection>
        {kit?.shape ? (
          <CardSection>
            <ResourcesLine doc={doc} kit={kit} onPatchKit={onPatchKit} />
          </CardSection>
        ) : null}
      </Card>

      <Card>
        <CardSection>
          <AgentFeed agent={agent} doc={doc} paused={paused} />
        </CardSection>
      </Card>

      <McpConnectCard compact target={{ kind: "project", id, name: doc.name, hasKit }} />

      {linkPanel}
    </div>
  );
}
