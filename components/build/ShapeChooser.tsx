"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { CustomSubsectors } from "@/components/build/CustomSubsectors";
import { SectorDeleteDialog, SectorDialog, sectorTitle } from "@/components/build/SectorDialog";
import { MetaLine } from "@/components/ui/MetaLine";
import { TextField } from "@/components/ideation/TextField";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { Collapsible } from "@/components/ui/Collapsible";
import { InfoTip } from "@/components/ui/InfoTip";
import { SECTOR_COPY, SECTOR_OPTIONS, closedSectorLabels, subsectorLabel } from "@/content/ideation";
import { kitsForDoc } from "@/content/kits";
import { FAMILY_LABELS, GATE_COPY, KIT_COPY, STARTING_POINT_OPTIONS, offeredShapes, shapeBlurb, shapeLabel } from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { shapesChange } from "@/lib/classify";
import type { ProjectDoc } from "@/lib/ideation";
import { KIT_LIMITS, type ProjectKit, emptyProjectKit, familiesOnMainnet, impliedShapesFor, kitShapes, missingFamilies, overlappingSubsectors, shapeCap } from "@/lib/kits";
import { usePlan } from "@/components/studio/PlanContext";
import { SECTOR_SUBSECTORS, type Sector, docSectors, sectorOfSubsector } from "@/lib/sectors";

/**
 * What the project is classed as (M96, moved out of the old editor's
 * Basics): sectors, subsectors, the product shapes, the starting point.
 * Since M185 a sector is added through a pop-up that walks its subsectors,
 * modules and build steps, then sits locked here with Edit and Delete; a
 * delete names everything it takes, done steps included.
 * The gate notes name the protocols missing on the project's testnet and
 * never block a pick. The ideas list and the overlap dialog left the UI;
 * their data and tools stay.
 */
export function ShapeChooser({
  doc,
  patch,
}: {
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
}) {
  const kit = doc.kit;
  const kitIds = kitsForDoc(doc);
  const sectors = docSectors(doc);
  const subsectors = doc.subsectors ?? [];
  const chainKey = projectChainOf(doc);
  const chain = chainInfo(chainKey);
  const envRows = KIT_ENVIRONMENTS[chainKey];
  const showKit = kitIds.length > 0;
  const patchKit = (partial: Partial<ProjectKit>) => patch({ kit: { ...(kit ?? emptyProjectKit(kitIds)), ...partial } });
  // Ours and own count together against the plan's cap (M176): 3 on Studio, 10 on Studio+.
  const cap = shapeCap(usePlan().plan === "studio_plus");

  /** One line per subsector the overlap rule ticked, from the click order stored in the doc. */
  const overlapHints = subsectors.flatMap((sub, i) => {
    const because = subsectors
      .slice(0, i)
      .find((prev) => sectorOfSubsector(prev) !== sectorOfSubsector(sub) && overlappingSubsectors(prev).includes(sub));
    return because ? [SECTOR_COPY.overlapHint(subsectorLabel(sub), subsectorLabel(because))] : [];
  });
  /** Names the protocols missing on this testnet, and the mainnet when they all run there. */
  const gateNote = (missing: ReturnType<typeof missingFamilies>) =>
    GATE_COPY.chipSuffix(
      missing.map((f) => FAMILY_LABELS[f]),
      chain.short,
      familiesOnMainnet(missing, envRows) ? chain.mainnetName : null,
    );
  // A subsector that offers exactly one shape names it on its own; older drafts catch up here.
  const impliedMissing = impliedShapesFor(subsectors).filter((s) => !kitShapes(kit).includes(s));
  useEffect(() => {
    if (impliedMissing.length) patch(shapesChange(doc, [...kitShapes(kit), ...impliedMissing]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impliedMissing.join(",")]);
  // The sector pop-ups (M185): add one, edit a locked one, or delete it with everything under it.
  const [dialog, setDialog] = useState<{ kind: "add" | "edit" | "delete"; sector: Sector } | null>(null);
  const unpicked = SECTOR_OPTIONS.filter((o) => !sectors.includes(o.value));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          <span>
            {SECTOR_COPY.label}
            <span className="ml-0.5 text-rose-400">*</span>
          </span>
          <InfoTip>{SECTOR_COPY.flow.hint}</InfoTip>
        </p>
        {sectors.length ? (
          <ul className="space-y-2">
            {sectors.map((sec) => {
              const subs = subsectors.filter((x) => (SECTOR_SUBSECTORS[sec] ?? []).includes(x));
              const mods = kitShapes(kit).filter((m) => offeredShapes(subs).includes(m));
              const notes = mods.flatMap((m) => (missingFamilies(m, envRows).length ? [`${shapeLabel(m) ?? m} ${gateNote(missingFamilies(m, envRows))}`] : []));
              return (
                <li key={sec} className="rounded-lg border border-ink-700/60 bg-ink-900 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-ink-50">{SECTOR_OPTIONS.find((o) => o.value === sec)?.title ?? sectorTitle(sec)}</p>
                      <p className="text-xs leading-relaxed text-ink-300">{doc.sectorNotes?.[sec] ?? (sec === "other" && doc.sectorOther ? doc.sectorOther : SECTOR_COPY.flow.cardNoNote)}</p>
                      <MetaLine
                        items={[
                          subs.length ? `${SECTOR_COPY.flow.cardSubsectors} ${subs.map(subsectorLabel).join(", ")}` : null,
                          mods.length ? `${SECTOR_COPY.flow.cardModules} ${mods.map((m) => shapeLabel(m) ?? m).join(", ")}` : null,
                        ]}
                      />
                      {notes.map((n) => (
                        <p key={n} className="text-xs text-ink-500">
                          {n}
                        </p>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <button type="button" onClick={() => setDialog({ kind: "edit", sector: sec })} className="text-ink-300 hover:text-ink-50 hover:underline">
                        {SECTOR_COPY.flow.edit}
                      </button>
                      <button type="button" onClick={() => setDialog({ kind: "delete", sector: sec })} className="text-ink-400 hover:text-rose-400 hover:underline">
                        {SECTOR_COPY.flow.delete}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-200">{SECTOR_COPY.flow.addTitle}</p>
        {unpicked.length ? (
          <ul className="space-y-2">
            {unpicked.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  disabled={o.available === false}
                  onClick={() => setDialog({ kind: "add", sector: o.value })}
                  className="flex w-full items-start gap-3 rounded-lg border border-dashed border-ink-700/60 px-4 py-3 text-left transition-colors hover:border-ink-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-100">{o.title ?? o.label}</span>
                    {o.sentence ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">{o.sentence}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{SECTOR_COPY.flow.addNone}</p>
        )}
        {closedSectorLabels().length ? <p className="text-xs text-ink-400">{SECTOR_COPY.moreSoon(closedSectorLabels())}</p> : null}
        {overlapHints.length > 0 ? <p className="text-xs text-ink-500">{overlapHints.join(" ")}</p> : null}
      </div>
      <CustomSubsectors doc={doc} sectors={sectors.filter((x) => (SECTOR_SUBSECTORS[x] ?? []).length > 0)} patch={patch} />
      {dialog?.kind === "add" || dialog?.kind === "edit" ? <SectorDialog doc={doc} sector={dialog.sector} cap={cap} onClose={() => setDialog(null)} patch={patch} /> : null}
      {dialog?.kind === "delete" ? <SectorDeleteDialog doc={doc} sector={dialog.sector} onClose={() => setDialog(null)} patch={patch} /> : null}
      {showKit ? (
        <>
          {kitShapes(kit).length && kit ? (
            <Collapsible summary={KIT_COPY.aboutShapes}>
              <div className="space-y-3 text-xs leading-relaxed text-ink-300">
                {kitShapes(kit).map((s) => (
                  <p key={s}>
                    <span className="font-medium text-ink-100">{shapeLabel(s)}. </span>
                    {shapeBlurb(s)}
                  </p>
                ))}
              </div>
            </Collapsible>
          ) : null}
          <ChipRadioGroup
            label={KIT_COPY.startingPointLabel}
            value={kit?.startingPoint ?? ""}
            onChange={(startingPoint) => patchKit({ startingPoint })}
            options={STARTING_POINT_OPTIONS}
          />
          {kit?.startingPoint === "existing_product" && (
            <TextField
              label={KIT_COPY.existingProductLabel}
              info={KIT_COPY.existingProductHint}
              value={kit.existingProduct ?? ""}
              onChange={(v) => patchKit({ existingProduct: v })}
              max={KIT_LIMITS.existingProduct.max}
              placeholder={KIT_COPY.existingProductPlaceholder}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
