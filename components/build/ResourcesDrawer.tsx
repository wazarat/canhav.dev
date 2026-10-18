"use client";

import Link from "next/link";

import { EnvironmentBlock } from "@/components/ideation/kit/EnvironmentBlock";
import { KitRail } from "@/components/ideation/kit/KitRail";
import { TemplateCard } from "@/components/ideation/kit/TemplateCard";
import { TemplateDecisionRow } from "@/components/ideation/kit/TemplateDecision";
import { Drawer } from "@/components/ui/Drawer";
import { BUILD_COPY } from "@/content/build";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
import type { ProjectChain } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import { type ProjectKit, kitShapes, setTemplateDecision, templateState } from "@/lib/kits";
import { templatesForShapes } from "@/lib/templates";

/** The sections of what CanHav gives a project, each one drawer. */
export type ResourceView = "pack" | "templates" | "environment";

export const RESOURCE_VIEWS: readonly ResourceView[] = ["pack", "templates", "environment"];

/**
 * The resources drawer (2026-10-18): what the project gets from CanHav, in
 * sections a builder can read and pick from. Reading is optional; the
 * agent receives all of it over MCP and chooses on its own. The pack keeps
 * its ticks, the templates their Using and Not using, the environment is
 * read only.
 */
export function ResourcesDrawer({
  view,
  onClose,
  doc,
  kit,
  chain,
  onPatchKit,
}: {
  view: ResourceView | null;
  onClose: () => void;
  doc: ProjectDoc;
  kit: ProjectKit | undefined;
  chain: ProjectChain;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const R = BUILD_COPY.resources;
  const open = view !== null;
  const title = view ? R.views[view] : R.drawerTitle;
  const shapes = kitShapes(kit);
  const templates = view === "templates" ? templatesForShapes(TEMPLATE_CATALOG, shapes, chain) : [];
  return (
    <Drawer open={open} onClose={onClose} title={title} closeLabel={R.drawerClose}>
      <p className="mb-4 text-xs leading-relaxed text-ink-500">{R.optional}</p>
      {!kit?.shape ? (
        <p className="text-sm text-ink-400">{BUILD_COPY.overview.noShape}</p>
      ) : view === "pack" ? (
        <KitRail doc={doc} kit={kit} step={null} onPatchKit={onPatchKit} />
      ) : view === "templates" ? (
        <div className="space-y-3">
          {templates.length === 0 ? <p className="text-sm text-ink-400">{R.templatesNone}</p> : null}
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              chains={[chain]}
              className="p-3"
              footer={
                <TemplateDecisionRow
                  state={templateState(kit, t.id)}
                  onDecide={(d) => onPatchKit(setTemplateDecision(kit, t.id, d))}
                />
              }
            />
          ))}
          <Link href="/studio/templates" className="inline-block text-xs text-electric-300 transition-colors hover:text-electric-200">
            {TEMPLATE_COPY.browse}
          </Link>
        </div>
      ) : view === "environment" ? (
        <EnvironmentBlock kit={kit} chain={chain} />
      ) : null}
    </Drawer>
  );
}
