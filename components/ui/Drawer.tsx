"use client";

import { useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { cn } from "@/lib/utils";

/**
 * A right side drawer (M93), the smallest one. Portal to the body, a flat
 * scrim with no blur, a panel on the ink-900 surface with a hairline left
 * border, a title row with a close button and a scrollable body. Escape
 * closes and focus returns to where it was.
 */
export function Drawer({
  open,
  onClose,
  title,
  closeLabel = "Close",
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The close button's accessible name. */
  closeLabel?: string;
  children: ReactNode;
  /** Extra classes on the body. */
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef, active: open });

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-ink-700/60 bg-ink-900 focus:outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink-700/40 px-5 py-4">
          <h2 className="truncate font-display text-base font-semibold tracking-tight text-ink-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
