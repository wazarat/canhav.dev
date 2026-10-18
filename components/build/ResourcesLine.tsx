"use client";

import { useMemo } from "react";
import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { BUILD_COPY } from "@/content/build";
import { KIT_CATALOG } from "@/content/kits/catalog";
import type { ProjectDoc } from "@/lib/ideation";
import { type ProjectKit, effectiveSelection, packCounts, packFor } from "@/lib/kits";

/**
 * The resource pack behind one line (M94). The pack itself lives in the
 * agent (get_resource_pack, RESOURCES.md); the page says how many core
 * resources it holds and Read opens the resources drawer on the pack.
 */
export function ResourcesLine({
  doc,
  kit,
  onOpen,
}: {
  doc: ProjectDoc;
  kit: ProjectKit;
  onOpen: () => void;
}) {
  const C = BUILD_COPY.resources;
  const counts = useMemo(() => {
    const pack = packFor(KIT_CATALOG, kit, doc);
    return packCounts(pack, effectiveSelection(pack, kit));
  }, [kit, doc]);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-ink-300">
      <span>{C.line(counts.core)}</span>
      <Button size="sm" variant="ghost" onClick={onOpen}>
        <BookOpen aria-hidden className="h-3.5 w-3.5" /> {C.read}
      </Button>
    </div>
  );
}
