"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { FIELD_STATE_COPY } from "@/content/ideation";
import { PROJECT_LIMITS, type ProjectDoc, type WaivableField } from "@/lib/ideation";
import { fieldState } from "@/lib/project-fields";

/**
 * A recommended field the team can mark not applicable (M130). Wraps the
 * field: while it is open a "Does not apply" link under it opens a one line
 * reason; once waived the field folds to the sentence that publishes, with
 * links to edit the reason or bring the field back. A stated value always
 * wins, so the link only shows while the field is empty. Without children
 * (the subsector picker, which the shape chooser renders) only the line
 * shows, named after the field.
 */
export function FieldWaiver({
  field,
  doc,
  patch,
  children,
}: {
  field: WaivableField;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  children?: React.ReactNode;
}) {
  const C = FIELD_STATE_COPY;
  const view = fieldState(doc, field);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(doc.waived?.[field] ?? "");
  const len = reason.trim().length;
  const ok = len >= PROJECT_LIMITS.waiver.min && reason.length <= PROJECT_LIMITS.waiver.max;

  const setWaiver = (value: string | null) => {
    const next: Partial<Record<WaivableField, string>> = { ...(doc.waived ?? {}) };
    if (value) next[field] = value.trim();
    else delete next[field];
    patch({ waived: Object.keys(next).length ? next : undefined });
  };

  if (view.state === "skip") return <>{children}</>;

  const form = (
    <div className="space-y-2">
      <Field
        label={C.reasonLabel}
        counter={len.toLocaleString("en-US")}
        range={`${PROJECT_LIMITS.waiver.min}–${PROJECT_LIMITS.waiver.max}`}
        counterMet={ok}
      >
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={PROJECT_LIMITS.waiver.max} placeholder={C.reasonPlaceholder} autoFocus />
      </Field>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!ok}
          onClick={() => {
            setWaiver(reason);
            setEditing(false);
          }}
        >
          {C.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {C.cancel}
        </Button>
      </div>
    </div>
  );

  if (view.state === "waived") {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-200">{view.label}</p>
        {editing ? (
          form
        ) : (
          <p className="text-sm text-ink-300">
            {view.text}
            <span className="ml-2 inline-flex gap-3 text-xs">
              <button type="button" onClick={() => setEditing(true)} className="text-ink-400 underline-offset-2 transition-colors hover:text-ink-100 hover:underline">
                {C.edit}
              </button>
              <button type="button" onClick={() => setWaiver(null)} className="text-ink-400 underline-offset-2 transition-colors hover:text-ink-100 hover:underline">
                {C.applies}
              </button>
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {children}
      {view.state === "missing" ? (
        editing ? (
          form
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-ink-400 underline-offset-2 transition-colors hover:text-ink-100 hover:underline">
            {children ? C.markNa : `${view.label} ${C.markNa.toLowerCase()}`}
          </button>
        )
      ) : null}
    </div>
  );
}
