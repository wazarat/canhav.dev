"use client";

import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";

import { KitRail } from "@/components/ideation/kit/KitRail";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { BUILD_COPY } from "@/content/build";
import { KIT_CATALOG } from "@/content/kits/catalog";
import type { ProjectDoc } from "@/lib/ideation";
import { type ProjectKit, effectiveSelection, packCounts, packFor } from "@/lib/kits";

/**
 * The resource pack behind one line (M94). The pack itself lives in the
 * agent (get_resource_pack, RESOURCES.md); the page says how many core
 * resources it holds and opens the rail in a drawer for whoever wants to
 * read or retick. Ticks go through patchKit so autosave stores them.
 */
export function ResourcesLine({
  doc,
  kit,
  onPatchKit,
}: {
  doc: ProjectDoc;
  kit: ProjectKit;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const C = BUILD_COPY.resources;
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => {
    const pack = packFor(KIT_CATALOG, kit, doc);
    return packCounts(pack, effectiveSelection(pack, kit));
  }, [kit, doc]);
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-ink-300">
      <span>{C.line(counts.core)}</span>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <BookOpen aria-hidden className="h-3.5 w-3.5" /> {C.read}
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title={C.drawerTitle} closeLabel={C.drawerClose}>
        <KitRail doc={doc} kit={kit} step={null} onPatchKit={onPatchKit} />
      </Drawer>
    </div>
  );
}
