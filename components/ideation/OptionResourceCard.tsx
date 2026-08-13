"use client";

import { useRef, useState } from "react";
import { BookOpen, X } from "lucide-react";

import { StatusChip } from "@/components/ui/StatusChip";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import {
  FIELD_INTROS,
  FIELD_RESOURCES,
  type OptionResource,
  type ResourceFieldKey,
  type ResourceIntroKey,
} from "@/content/ideation-resources";
import { cn } from "@/lib/utils";

/**
 * Contextual resources in the token editor. Deployability consequences stay
 * INLINE (they are safety signals); the teaching copy (body, worked example,
 * links) lives behind a small trigger that opens a themed dialog, keeping
 * the nine steps scannable. Content is data in content/ideation-resources.ts.
 */

function ResourceDialog({
  resource,
  fallbackTitle,
  onClose,
}: {
  resource: OptionResource;
  fallbackTitle: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: true });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={resource.title ?? fallbackTitle}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-ink-700/70 animate-fade-in-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative overflow-hidden border-b border-ink-800/60 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(61,123,255,0.18),transparent_65%)] p-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/80">
            <BookOpen className="h-4 w-4 text-electric-400" />
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-ink-50">
            {resource.title ?? fallbackTitle}
          </h3>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-sm leading-relaxed text-ink-200">{resource.body}</p>
          {resource.example && (
            <p className="rounded-xl border border-ink-800/70 bg-ink-950/50 p-3.5 text-sm leading-relaxed text-ink-400">
              {resource.example}
            </p>
          )}
          {resource.links && resource.links.length > 0 && (
            <p className="text-sm">
              {resource.links.map((l, i) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-electric-400 transition-colors hover:text-ink-50"
                >
                  {l.label}
                  {i < resource.links!.length - 1 ? " · " : ""}
                </a>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceTrigger({
  resource,
  label,
}: {
  resource: OptionResource;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-700/60 bg-ink-900/60 px-2.5 py-1 text-[11px] font-medium text-ink-300 transition-colors hover:border-electric-500/40 hover:text-ink-50"
      >
        <BookOpen aria-hidden className="h-3 w-3 text-electric-400" />
        {label}
      </button>
      {open && (
        <ResourceDialog resource={resource} fallbackTitle={label} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** Inline deployability chip: the safety signal never hides in a popup. */
function DeployabilityChip({ resource }: { resource: OptionResource }) {
  const d = resource.deployability;
  if (!d) return null;
  return (
    <StatusChip tone={d.tier === "custom" ? "warning" : "neutral"} variant="block">
      <span className="block">{d.text}</span>
      {d.fix && <span className="mt-1 block font-medium text-ink-100">{d.fix}</span>}
    </StatusChip>
  );
}

/** Resource affordances for the currently selected option of a field. */
export function OptionResourceCard({
  field,
  value,
}: {
  field: ResourceFieldKey;
  value: string;
}) {
  if (!value) return null;
  const r = (FIELD_RESOURCES[field] as Record<string, OptionResource>)[value];
  if (!r) return null;
  return (
    <div className={cn("space-y-2", !r.deployability && "-mt-2")}>
      <DeployabilityChip resource={r} />
      <ResourceTrigger resource={r} label="Why this matters" />
    </div>
  );
}

/** Field-level intro (explains a phrase or frames a question). */
export function FieldIntroCard({ intro }: { intro: ResourceIntroKey }) {
  const r: OptionResource = FIELD_INTROS[intro];
  return (
    <div className={cn("space-y-2", !r.deployability && "-mt-2")}>
      <DeployabilityChip resource={r} />
      <ResourceTrigger resource={r} label={r.title ?? "What this means"} />
    </div>
  );
}
