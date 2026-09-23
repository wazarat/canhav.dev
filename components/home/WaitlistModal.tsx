"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";

import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { WAITLIST_COPY } from "@/content/waitlist";

/**
 * Modal shell around WaitlistForm. Opened from the nav, the hero and the
 * sign-in page. The form itself is shared with the /waitlist page.
 */
export function WaitlistModal({
  open,
  onClose,
  sourcePage,
}: {
  open: boolean;
  onClose: () => void;
  /** Lead attribution, stored as `source_page` on the lead row. */
  sourcePage: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: open });

  if (!open) return null;

  // Portal to <body>: trigger containers may carry a transform (animate-fade-in-up
  // keeps one via fill forwards), which would otherwise trap position: fixed.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join the CanHav waitlist"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-700/70 animate-fade-in-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-[1fr_240px]">
          <div className="p-6 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-electric-400">
              {WAITLIST_COPY.kicker}
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-50">
              {WAITLIST_COPY.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
              {WAITLIST_COPY.modalIntro}
            </p>
            <div className="mt-5">
              <WaitlistForm sourcePage={sourcePage} onClose={onClose} />
            </div>
          </div>

          {/* Mascot pane (decorative) */}
          <div
            aria-hidden="true"
            className="relative hidden overflow-hidden rounded-r-2xl border-l border-ink-800/60 md:block"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(92,146,255,0.18), transparent 60%), rgba(10,13,20,0.6)",
            }}
          >
            <Image
              src="/mascot-research.png"
              alt=""
              fill
              sizes="240px"
              className="object-cover object-top"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
