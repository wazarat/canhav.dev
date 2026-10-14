"use client";

import { useEffect, useState } from "react";

import { STUDIO_COPY } from "@/content/ideation";
import { openCommandMenu } from "@/lib/command-menu";

/** The small key hint in the studio header that opens the command menu (M87). */
export function CommandMenuHint() {
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  const C = STUDIO_COPY.command;
  return (
    <button
      type="button"
      onClick={openCommandMenu}
      title={C.hintTitle}
      aria-label={C.hintTitle}
      className="inline-flex items-center gap-1.5 rounded-md border border-ink-700/60 bg-ink-900 px-2 py-1 font-mono text-[11px] text-ink-400 transition-colors hover:text-ink-100"
    >
      <kbd>{mac ? C.hintMac : C.hintOther}</kbd>
    </button>
  );
}
