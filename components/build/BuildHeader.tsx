"use client";

import { useEffect } from "react";
import Link from "next/link";

import { AutosaveIndicator } from "@/components/ideation/AutosaveIndicator";
import type { PublishStatus } from "@/components/ideation/usePublish";
import type { SaveState } from "@/components/ideation/useAutosave";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import { setStudioEntity } from "@/lib/studio-entity";

/**
 * The project page header (M94): kicker, logo and name, the agent status
 * as plain text, autosave, the Draft or Published chip and the publish
 * buttons. The same chrome EditorShell gives the token editor, without the
 * step pills, which the tabs replace.
 */
export function BuildHeader({
  id,
  name,
  logo,
  agentLine,
  initialStatus,
  initialSlug,
  saveState,
  publishStatus,
  canPublish,
  publishProblem,
  onPublish,
  onUnpublish,
  headerActions,
}: {
  id: string;
  name: string;
  logo: string | null;
  /** One of BUILD_COPY.agent. */
  agentLine: string;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  saveState: SaveState;
  publishStatus: PublishStatus;
  canPublish: boolean;
  publishProblem: string | null;
  onPublish: () => void;
  onUnpublish: () => void;
  headerActions?: React.ReactNode;
}) {
  // The nav switcher follows the name as it is typed (M92).
  useEffect(() => {
    setStudioEntity({ kind: "project", id, name });
    return () => setStudioEntity(null);
  }, [id, name]);

  const isPublished =
    publishStatus.kind === "published" ||
    (initialStatus === "published" && publishStatus.kind !== "unpublished");
  const slug = publishStatus.kind === "published" ? publishStatus.slug : initialSlug;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="kicker">
            <Link href="/studio" className="transition-colors hover:text-ink-200">
              {BUILD_COPY.kicker}
            </Link>
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-semibold tracking-tight text-ink-50">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-ink-700/60 object-cover" />
            ) : null}
            <span>{name || "Untitled"}</span>
          </h1>
          <p className="mt-2 text-xs text-ink-400">{agentLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerActions}
          <AutosaveIndicator state={saveState} />
          {isPublished && slug ? (
            <StatusChip tone="success">
              Published ·{" "}
              <Link href={`/p/${slug}`} className="text-electric-300 transition-colors hover:text-electric-200">
                /p/{slug}
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
            {publishStatus.kind === "working" ? "Working…" : isPublished ? "Republish" : "Publish"}
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
        <p className="mt-4 text-xs text-ink-500">Publishing is blocked. {publishProblem}</p>
      )}
    </>
  );
}
