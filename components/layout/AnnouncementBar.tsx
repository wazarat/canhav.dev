"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";

import { ANNOUNCEMENT } from "@/content/site";

const STORAGE_KEY = "canhav:announcement-dismissed";

/**
 * Site-wide strip above the nav with one link and a close button. Closing it
 * remembers the announcement id in localStorage, so it stays closed until a
 * new id ships. Rendered only after mount, so a visitor who closed it never
 * sees it flash, and pages stay statically rendered.
 */
export function AnnouncementBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ANNOUNCEMENT) return;
    let dismissed: string | null = null;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage blocked (private mode, cleared site data); show the strip.
    }
    setOpen(dismissed !== ANNOUNCEMENT.id);
  }, []);

  if (!ANNOUNCEMENT || !open) return null;
  const { id, text, linkLabel, href } = ANNOUNCEMENT;

  function dismiss() {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Closed for this page view only.
    }
  }

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative z-50 border-b border-electric-500/30 bg-gradient-to-r from-electric-600/90 via-neon-600/90 to-electric-600/90"
    >
      <div className="container flex min-h-10 items-center justify-center gap-3 py-2 pr-10 text-center text-sm text-white">
        <p>
          {text}{" "}
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold underline decoration-white/50 underline-offset-4 transition-colors hover:decoration-white"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>{" "}
          to read it.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
