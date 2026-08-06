"use client";

import Link from "next/link";

import { AutosaveIndicator } from "@/components/ideation/AutosaveIndicator";
import { type StepDef, StepNav } from "@/components/ideation/StepNav";
import type { PublishStatus } from "@/components/ideation/usePublish";
import type { SaveState } from "@/components/ideation/useAutosave";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";

/**
 * Shared chrome for both ideation editors: header (back link, name, autosave
 * + publish state), step pills, body, and back/next footer.
 */
export function EditorShell({
  kicker,
  name,
  publicBase,
  initialStatus,
  initialSlug,
  saveState,
  publishStatus,
  canPublish,
  publishProblem,
  onPublish,
  onUnpublish,
  steps,
  current,
  onSelectStep,
  children,
}: {
  kicker: string;
  name: string;
  publicBase: "/p" | "/t";
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  saveState: SaveState;
  publishStatus: PublishStatus;
  canPublish: boolean;
  /** First remaining validation problem, shown next to a disabled publish. */
  publishProblem: string | null;
  onPublish: () => void;
  onUnpublish: () => void;
  steps: StepDef[];
  current: number;
  onSelectStep: (i: number) => void;
  children: React.ReactNode;
}) {
  const isPublished =
    publishStatus.kind === "published" ||
    (initialStatus === "published" && publishStatus.kind !== "unpublished");
  const slug = publishStatus.kind === "published" ? publishStatus.slug : initialSlug;

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">
            <Link href="/studio" className="transition-colors hover:text-ink-200">
              Studio
            </Link>{" "}
            / {kicker}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-50">
            {name || "Untitled"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AutosaveIndicator state={saveState} />
          {isPublished && slug ? (
            <StatusChip tone="success">
              Published ·{" "}
              <Link
                href={`${publicBase}/${slug}`}
                className="text-electric-300 transition-colors hover:text-electric-200"
              >
                {publicBase}/{slug}
              </Link>
            </StatusChip>
          ) : (
            <StatusChip tone="neutral">Draft</StatusChip>
          )}
          <Button
            size="sm"
            onClick={onPublish}
            disabled={!canPublish || publishStatus.kind === "working"}
            title={publishProblem ?? undefined}
          >
            {publishStatus.kind === "working"
              ? "Working…"
              : isPublished
                ? "Republish"
                : "Publish"}
          </Button>
          {isPublished && (
            <Button size="sm" variant="ghost" onClick={onUnpublish}>
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {publishStatus.kind === "error" && (
        <div className="mt-4 max-w-xl">
          <StatusChip tone="error" variant="block">
            {publishStatus.message}
          </StatusChip>
        </div>
      )}
      {!canPublish && publishProblem && (
        <p className="mt-4 text-xs text-ink-500">To publish: {publishProblem}</p>
      )}

      <div className="mt-8">
        <StepNav steps={steps} current={current} onSelect={onSelectStep} />
      </div>

      <div className="mt-8">{children}</div>

      <div className="mt-10 flex items-center justify-between border-t border-ink-800/70 pt-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectStep(current - 1)}
          disabled={current === 0}
        >
          ← Back
        </Button>
        {current < steps.length - 1 && (
          <Button size="sm" variant="outline" onClick={() => onSelectStep(current + 1)}>
            Next: {steps[current + 1].label} →
          </Button>
        )}
      </div>
    </div>
  );
}
