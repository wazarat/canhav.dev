"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { CheckItem } from "@/components/ui/CheckItem";
import { Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { KIT_COPY } from "@/content/kits/copy";
import { KIT_LIMITS, type ProductShape, type ProjectKit, editIdea, ideaRows, toggleIdea } from "@/lib/kits";

/**
 * "What you could build" under a chosen shape (M68 follow-up). The catalog
 * examples are tickable and editable, the team's own lines sit under them,
 * and the ticks and lines live on kit.ideas where the agent reads them.
 * Editing a catalog example stores the new text as an own line with the
 * original recorded, so removing it brings the example back.
 */
export function IdeasList({
  shape,
  examples,
  kit,
  onPatchKit,
}: {
  shape: ProductShape;
  examples: readonly string[];
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ text: string; value: string } | null>(null);
  const rows = ideaRows(kit, shape, examples);
  const atMax = (kit.ideas?.length ?? 0) >= KIT_LIMITS.ideas.max;
  const min = KIT_LIMITS.ideas.textMin;
  const add = () => {
    const text = draft.trim();
    if (text.length < min) return;
    onPatchKit(toggleIdea(kit, shape, text, true));
    setDraft("");
  };
  const save = (row: { text: string; own: boolean }) => {
    if (!editing || editing.value.trim().length < min) return;
    onPatchKit(editIdea(kit, shape, row.text, editing.value, !row.own));
    setEditing(null);
  };
  const iconBtn =
    "mt-1.5 rounded-md p-1 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100";
  return (
    <div className="mt-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{KIT_COPY.examplesTitle}</p>
      <ul className="mt-0.5 space-y-0.5">
        {rows.map((r) =>
          editing?.text === r.text ? (
            <li key={r.text} className="flex items-center gap-2 py-1">
              <Input
                autoFocus
                value={editing.value}
                onChange={(e) => setEditing({ text: r.text, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    save(r);
                  }
                  if (e.key === "Escape") setEditing(null);
                }}
                maxLength={KIT_LIMITS.ideas.textMax}
                aria-label={KIT_COPY.ideaEditTitle}
                className="h-8 flex-1 text-xs"
              />
              <Button type="button" size="sm" variant="outline" disabled={editing.value.trim().length < min} onClick={() => save(r)}>
                {KIT_COPY.ideaSave}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                {KIT_COPY.ideaCancel}
              </Button>
            </li>
          ) : (
            <li key={r.text} className="flex items-start gap-1">
              <CheckItem
                className="flex-1 py-1"
                checked={r.on}
                onChange={(v) => onPatchKit(toggleIdea(kit, shape, r.text, v))}
                label={
                  <span className="text-xs leading-relaxed text-ink-300">
                    {r.text}
                    {r.own ? (
                      <StatusChip tone="neutral" className="ml-2 px-1.5 py-0 text-[10px]">
                        {r.from ? KIT_COPY.ideaEdited : KIT_COPY.ideaOwn}
                      </StatusChip>
                    ) : null}
                  </span>
                }
              />
              <button
                type="button"
                onClick={() => setEditing({ text: r.text, value: r.text })}
                aria-label={KIT_COPY.ideaEdit(r.text)}
                title={KIT_COPY.ideaEditTitle}
                className={iconBtn}
              >
                <Pencil aria-hidden className="h-3 w-3" />
              </button>
              {r.own ? (
                <button
                  type="button"
                  onClick={() => onPatchKit(toggleIdea(kit, shape, r.text, false))}
                  aria-label={KIT_COPY.ideaRemove(r.text)}
                  className={iconBtn}
                >
                  <Trash2 aria-hidden className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ),
        )}
      </ul>
      <div className="mt-1.5 flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          maxLength={KIT_LIMITS.ideas.textMax}
          placeholder={KIT_COPY.ideaPlaceholder}
          aria-label={KIT_COPY.examplesTitle}
          disabled={atMax}
          className="h-8 flex-1 text-xs"
        />
        <Button type="button" size="sm" variant="outline" disabled={atMax || draft.trim().length < min} onClick={add}>
          {KIT_COPY.ideaAdd}
        </Button>
      </div>
    </div>
  );
}
