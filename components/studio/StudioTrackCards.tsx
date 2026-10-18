"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { TrackCardShell, trackCardSurface } from "@/components/studio/TrackCardShell";
import { SoonBadge } from "@/components/ui/SoonBadge";
import { STUDIO_TRACKS } from "@/content/ideation";
import { openNewProject } from "@/lib/new-project";
import { cn } from "@/lib/utils";

/**
 * The studio's three tracks as product cards, in launch order: Token Design
 * and Studio (both live) → Agents Launch (coming soon). The card shell lives
 * in TrackCardShell (M91) so the new project flow's sector cards share it;
 * graphics are purpose-built minis. Since M91 the Studio card opens the new
 * project pop up instead of creating a blank draft.
 */

/** Mini allocation meters: the token track's signature output. */
function TokenGraphic() {
  const rows = [
    { label: "Sale", pct: 45 },
    { label: "Liquidity", pct: 30 },
    { label: "Team", pct: 25 },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between font-mono text-[10px] text-ink-300">
            <span>{r.label}</span>
            <span className="tabular">{r.pct}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric-500 to-[#4FE3F5]"
              style={{ width: `${r.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

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
          <span
            className={cn(
              "h-1.5 rounded-full",
              r.tinted ? "bg-neon-400/40" : "bg-ink-700/70",
            )}
            style={{ width: r.width }}
          />
        </div>
      ))}
    </div>
  );
}

/** Small node graph: agents attached to a verified center. */
function AgentsGraphic() {
  return (
    <svg viewBox="0 0 200 64" className="h-16 w-full" aria-hidden>
      <g stroke="#22D3EE" strokeOpacity="0.35" strokeDasharray="3 3">
        <line x1="30" y1="14" x2="100" y2="32" />
        <line x1="170" y1="14" x2="100" y2="32" />
        <line x1="52" y1="54" x2="100" y2="32" />
        <line x1="148" y1="54" x2="100" y2="32" />
      </g>
      <g className="fill-ink-900" stroke="#22D3EE" strokeOpacity="0.5">
        <circle cx="30" cy="14" r="6" />
        <circle cx="170" cy="14" r="6" />
        <circle cx="52" cy="54" r="6" />
        <circle cx="148" cy="54" r="6" />
      </g>
      <circle cx="100" cy="32" r="8" className="fill-ink-900" stroke="#22D3EE" strokeOpacity="0.9" />
      <circle cx="100" cy="32" r="2.5" fill="#22D3EE" fillOpacity="0.9" />
    </svg>
  );
}

/** The token track creates a blank draft, then opens its editor. */
const TRACK_ROUTES = {
  token: { api: "/api/ideation/token-designs", editor: "/studio/token" },
} as const;

type TrackKind = keyof typeof TRACK_ROUTES;

export function StudioTrackCards() {
  const router = useRouter();
  const [working, setWorking] = useState<TrackKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createDraft(kind: TrackKind) {
    setWorking(kind);
    setError(null);
    try {
      const routes = TRACK_ROUTES[kind];
      const res = await fetch(routes.api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create a draft.");
      router.push(`${routes.editor}/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a draft.");
      setWorking(null);
    }
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => void createDraft("token")}
          disabled={working !== null}
          aria-busy={working === "token"}
          className={cn(trackCardSurface, "hover:border-electric-500/60 focus-visible:ring-electric-500/70 disabled:cursor-wait disabled:opacity-80")}
        >
          <TrackCardShell
            tint="electric"
            graphic={<TokenGraphic />}
            title={STUDIO_TRACKS.token.title}
            description={STUDIO_TRACKS.token.description}
            footer={
              <span className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-electric-400 transition-colors group-hover:text-ink-50">
                {working === "token"
                  ? STUDIO_TRACKS.token.ctaWorking
                  : STUDIO_TRACKS.token.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            }
          />
        </button>

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

        <div className="glass overflow-hidden rounded-xl border border-ink-800/70">
          <TrackCardShell
            muted
            tint="signal"
            badge={<SoonBadge accent="signal" />}
            graphic={<AgentsGraphic />}
            title={STUDIO_TRACKS.agents.title}
            description={STUDIO_TRACKS.agents.description}
            footer={
              <p className="pt-1 text-sm leading-relaxed text-ink-500">
                {STUDIO_TRACKS.agents.note}
              </p>
            }
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
