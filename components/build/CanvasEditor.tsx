"use client";

import { DraftButton } from "@/components/build/DraftButton";
import { TextField } from "@/components/ideation/TextField";
import { StatusChip } from "@/components/ui/StatusChip";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftCanvasPrompt } from "@/lib/agent-prompts-draft";
import { CANVAS_BLOCKS, CANVAS_LIMITS, type Canvas, type CanvasBlock, canvasFilled } from "@/lib/canvas";

/**
 * The Business Model Canvas on Decisions (M113): nine text blocks with
 * counters, one Draft for the whole canvas, a Redraft on each block, and
 * the prompt that asks the owner's agent instead. Every change lands
 * through the record's patch, so autosave and the agent revision guard
 * work as for any field.
 */
export function CanvasEditor({
  projectId,
  name,
  canvas,
  onChange,
}: {
  projectId: string;
  name: string;
  canvas: Canvas | undefined;
  onChange: (next: Canvas) => void;
}) {
  const C = STUDIO_PLUS_COPY.canvas;
  const current = canvas ?? {};
  const set = (block: CanvasBlock, text: string) => onChange({ ...current, [block]: text });
  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      <div className="flex flex-wrap items-center gap-3">
        <DraftButton<Record<CanvasBlock, string>>
          projectId={projectId}
          kind="canvas"
          label={C.draft}
          onResult={(value) => onChange({ ...current, ...value })}
          agentPrompt={draftCanvasPrompt(name, projectId)}
        />
        <StatusChip tone={canvasFilled(current) === CANVAS_BLOCKS.length ? "success" : "neutral"}>{C.filled(canvasFilled(current))}</StatusChip>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {CANVAS_BLOCKS.map((block) => (
          <div key={block} className="space-y-2">
            <TextField
              label={C.blocks[block].label}
              hint={C.blocks[block].hint}
              value={current[block] ?? ""}
              onChange={(v) => set(block, v)}
              max={CANVAS_LIMITS.block.max}
              rows={4}
            />
            <DraftButton<{ text: string }>
              projectId={projectId}
              kind="canvas_block"
              body={{ block }}
              label={C.redraft}
              onResult={(value) => set(block, value.text)}
              gate={false}
              variant="outline"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
