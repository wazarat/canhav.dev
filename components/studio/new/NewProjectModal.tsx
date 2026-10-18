"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { NewProjectWizard } from "@/components/studio/new/NewProjectWizard";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { NEW_PROJECT_COPY } from "@/content/studio-new";
import { NEW_PROJECT_PARAM, OPEN_NEW_PROJECT_EVENT } from "@/lib/new-project";

/**
 * The new project flow as a pop up over whatever studio page is open.
 * Opens on the window event from lib/new-project or on ?new=1 (the deep
 * link and the sign in round trip land there); closing strips the flag.
 */
export function NewProjectModal({ logoUploads }: { logoUploads: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_NEW_PROJECT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NEW_PROJECT_EVENT, onOpen);
  }, []);

  const flagged = params.get(NEW_PROJECT_PARAM) === "1";
  useEffect(() => {
    if (flagged) setOpen(true);
  }, [flagged]);

  const close = useCallback(() => {
    setOpen(false);
    if (flagged) {
      const qs = new URLSearchParams(params.toString());
      qs.delete(NEW_PROJECT_PARAM);
      const s = qs.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    }
  }, [flagged, params, pathname, router]);

  useModalBehavior({ onClose: close, containerRef, active: open });

  if (!open) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={NEW_PROJECT_COPY.title} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={close} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-3xl rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none"
      >
        <NewProjectWizard logoUploads={logoUploads} onClose={close} />
      </div>
    </div>,
    document.body,
  );
}
