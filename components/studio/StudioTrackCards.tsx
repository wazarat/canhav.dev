"use client";

import { ArrowRight } from "lucide-react";

import { TrackCardShell, trackCardSurface } from "@/components/studio/TrackCardShell";
import { STUDIO_TRACKS } from "@/content/ideation";
import { openNewProject } from "@/lib/new-project";
import { cn } from "@/lib/utils";

/**
 * The studio's one track card (2026-10-18): the studio launches projects,
 * so the home opens with one card that starts a project. The token design
 * and agents launch cards left the home; a token design is started from
 * a project's Overview or the new project pop up, and the agent launch
 * track is not open yet. The shell lives in TrackCardShell so the new
 * project pop up's sector cards share it.
 */

/** A record coming together: checklist dots and skeleton lines. */
function ProjectsGraphic() {
  const rows = [
    { width: "70%", tinted: true },
    { width: "50%", tinted: false },
    { width: "60%", tinted: false },
  ];
  return (
    <div className="space-y-3 py-0.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-3.5 w-3.5 shrink-0 rounded-full border",
              r.tinted ? "border-neon-400/60 bg-neon-400/20" : "border-ink-700 bg-ink-900",
            )}
          />
          <span className={cn("h-1.5 rounded-full", r.tinted ? "bg-neon-400/40" : "bg-ink-700/70")} style={{ width: r.width }} />
        </div>
      ))}
    </div>
  );
}

export function StudioTrackCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <button
        type="button"
        onClick={openNewProject}
        className={cn(trackCardSurface, "hover:border-neon-500/60 focus-visible:ring-neon-500/70")}
      >
        <TrackCardShell
          tint="neon"
          graphic={<ProjectsGraphic />}
          title={STUDIO_TRACKS.projects.title}
          description={STUDIO_TRACKS.projects.description}
          footer={
            <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-neon-400 transition-colors group-hover:text-ink-50">
              {STUDIO_TRACKS.projects.cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          }
        />
      </button>
    </div>
  );
}
