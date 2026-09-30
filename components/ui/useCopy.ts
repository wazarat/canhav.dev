"use client";

import { useEffect, useState } from "react";

/**
 * Copy `text` to the clipboard and report "copied" for two seconds. The async
 * clipboard API first, then the selection based fallback for insecure
 * contexts and denied permissions. When neither works nothing visible
 * happens and the text stays selectable. Shared by CopyLine and CopyBlock.
 */
export function useCopyToClipboard(text: string): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return;
    } catch {
      // Async clipboard denied. Fall through to the selection-based copy.
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      if (ok) setCopied(true);
    } catch {
      // Nothing else to try. The text stays selectable for manual copy.
    }
  }

  return { copied, copy };
}
