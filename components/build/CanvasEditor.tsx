"use client";

import { useState } from "react";

import { CanvasBlockFrame, CanvasGrid, CanvasItemsList } from "@/components/build/CanvasGrid";
import { DraftControl, type DraftMeta } from "@/components/build/DraftControl";
import { ItemsEditor } from "@/components/build/ItemsEditor";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftCanvasPrompt } from "@/lib/agent-prompts-draft";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { CANVAS_ITEM_LIMITS, type Canvas, type CanvasBlock, type CanvasDraft, canvasFilled } from "@/lib/canvas";
import { type CanvasItem, normalizeItems } from "@/lib/canvas-items";
import type { ProjectDoc } from "@/lib/ideation";

/**
 * The Business Model Canvas on the Business model tab (M113, a grid of
 * items since M155): the classic layout, each block a short list of items
 * opened for editing in place, one Draft control for the whole canvas at
 * the top and a Redraft link per block in its edit state (M141). Every
 * change lands through the record's patch, so autosave and the agent
 * revision guard work as for any field.
 */
export function CanvasEditor({
  projectId,
  name,
  meta,
  patch,
  agentMode,
  canvas,
  onChange,
}: {
  projectId: string;
  name: string;
  /** The record's draft requests and marks, the patch that writes them, and the agent mode (M117). */
  meta: DraftMeta;
  patch: (p: Partial<ProjectDoc>) => void;
  agentMode: AgentWriteMode;
  canvas: Canvas | undefined;
  onChange: (next: Canvas) => void;
}) {
  const C = STUDIO_PLUS_COPY.canvas;
  const current = canvas ?? {};
  const [editing, setEditing] = useState<CanvasBlock | null>(null);
  const set = (block: CanvasBlock, items: CanvasItem[]) => {
    const next: Canvas = { ...current };
    if (items.length) next[block] = items;
    else delete next[block];
    onChange(next);
  };
  /** A draft's short lines become items with fresh ids (M155). */
  const fromLines = (lines: readonly string[]): CanvasItem[] => normalizeItems(lines, CANVAS_ITEM_LIMITS);
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      <div className="flex flex-wrap items-center gap-3">
        <DraftControl<CanvasDraft>
          projectId={projectId}
          doc={meta}
          patch={patch}
          agentMode={agentMode}
          kind="canvas"
          label={C.draft}
          onResult={(value) => {
            const next: Canvas = { ...current };
            for (const [b, lines] of Object.entries(value) as Array<[CanvasBlock, string[]]>) {
              const items = fromLines(lines);
              if (items.length) next[b] = items;
            }
            onChange(next);
          }}
          agentPrompt={draftCanvasPrompt(name, projectId)}
        />
        <span className="text-xs text-ink-400">{C.filled(canvasFilled(current))}</span>
      </div>
      <CanvasGrid
        render={(block, placement) => {
          const items = current[block] ?? [];
          const open = editing === block;
          return (
            <CanvasBlockFrame
              key={block}
              block={block}
              title={C.blocks[block].label}
              className={placement}
              onOpen={open ? undefined : () => setEditing(block)}
              action={
                open ? (
                  <DraftControl<{ items: string[] }>
                    projectId={projectId}
                    doc={meta}
                    patch={patch}
                    agentMode={agentMode}
                    kind="canvas_block"
                    target={block}
                    body={{ block }}
                    label={C.redraft}
                    onResult={(value) => set(block, fromLines(value.items))}
                    agentPrompt={draftCanvasPrompt(name, projectId)}
                    gate={false}
                    variant="link"
                  />
                ) : (
                  <button type="button" onClick={() => setEditing(block)} className="text-xs text-ink-400 transition-colors hover:text-ink-50 hover:underline">
                    {items.length ? C.edit : C.add}
                  </button>
                )
              }
            >
              {open ? (
                <ItemsEditor items={items} onChange={(next) => set(block, next)} onDone={() => setEditing(null)} limits={CANVAS_ITEM_LIMITS} />
              ) : (
                <CanvasItemsList items={items} empty={C.empty} />
              )}
            </CanvasBlockFrame>
          );
        }}
      />
    </div>
  );
}
