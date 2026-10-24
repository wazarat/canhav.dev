"use client";

import { useEffect } from "react";

import { TextField } from "@/components/ideation/TextField";
import { ChipMultiSelectGroups, type ChipOption, ChipRadioGroup } from "@/components/ui/ChipGroup";
import { ChoiceCardGroups } from "@/components/ui/ChoiceCard";
import { Collapsible } from "@/components/ui/Collapsible";
import { InfoTip } from "@/components/ui/InfoTip";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  ALL_SUBSECTOR_OPTIONS,
  SECTOR_COPY,
  SECTOR_OPTIONS,
  closedSectorLabels,
  optionLabel,
  subsectorLabel,
  subsectorOptionsFor,
} from "@/content/ideation";
import { kitsForDoc } from "@/content/kits";
import {
  FAMILY_LABELS,
  GATE_COPY,
  KIT_COPY,
  STARTING_POINT_OPTIONS,
  shapeBlurb,
  shapeBuildingPhrase,
  shapeGroupsFor,
  shapeLabel,
} from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { sectorsChange, shapesChange, subsectorsChange } from "@/lib/classify";
import { PROJECT_LIMITS, type ProjectDoc } from "@/lib/ideation";
import {
  KIT_LIMITS,
  type ProductShape,
  type ProjectKit,
  SHAPE_FAMILIES,
  emptyProjectKit,
  familiesOnMainnet,
  impliedShapesFor,
  kitShapes,
  missingFamilies,
  overlappingSubsectors,
  shapesFor,
} from "@/lib/kits";
import { SECTOR_SUBSECTORS, type Sector, type Subsector, docSectors, sectorOfSubsector } from "@/lib/sectors";
import { templateChainCounts, templatesForShapes } from "@/lib/templates";

/**
 * What the project is classed as (M96, moved out of the old editor's
 * Basics): sectors, subsectors, the product shapes, the starting point.
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
  const onSectors = (v: Sector[]) => patch(sectorsChange(doc, v));
  const onSubsectors = (v: Subsector[]) => patch(subsectorsChange(doc, v));
  const onShapes = (shapes: readonly string[]) => patch(shapesChange(doc, shapes as ProductShape[]));

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
  const subsectorGroups = sectors
    .filter((sec) => subsectorOptionsFor(sec).length > 0)
    .map((sec) => ({
      key: sec,
      heading: SECTOR_OPTIONS.find((o) => o.value === sec)?.title ?? optionLabel(SECTOR_OPTIONS, sec),
      options: subsectorOptionsFor(sec).map((o): ChipOption<Subsector> => {
        const shapes = shapesFor([o.value]);
        return shapes.every((s) => missingFamilies(s, envRows).length > 0)
          ? { ...o, note: gateNote([...new Set(shapes.flatMap((s) => missingFamilies(s, envRows)))]) }
          : o;
      }),
    }));
  const subsectorGated = subsectorGroups.some((g) => g.options.some((o) => o.note));
  // A subsector that offers exactly one shape names it on its own; older drafts catch up here.
  const singleSubs = subsectors.filter((sub) => shapesFor([sub]).length === 1);
  const impliedMissing = impliedShapesFor(subsectors).filter((s) => !kitShapes(kit).includes(s));
  useEffect(() => {
    if (impliedMissing.length) patch(shapesChange(doc, [...kitShapes(kit), ...impliedMissing]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impliedMissing.join(",")]);
  const buildingLines = singleSubs.map((sub) => {
    const shape = shapesFor([sub])[0];
    const option = ALL_SUBSECTOR_OPTIONS.find((o) => o.value === sub);
    const missing = missingFamilies(shape, envRows);
    const counts =
      SHAPE_FAMILIES[shape].length === 0
        ? templateChainCounts(templatesForShapes(TEMPLATE_CATALOG, [shape], chainKey), chainKey)
        : null;
    const otherKey: ProjectChain = chainKey === "robinhood_testnet" ? "arbitrum_sepolia" : "robinhood_testnet";
    const other = chainInfo(otherKey);
    const liveThere = templateChainCounts(templatesForShapes(TEMPLATE_CATALOG, [shape], otherKey), otherKey).live;
    return {
      shape,
      line: KIT_COPY.buildingLine(shapeBuildingPhrase(shape), option?.sentence ?? ""),
      gateNote: missing.length > 0 ? gateNote(missing) : null,
      noTemplate: counts !== null && counts.total > 0 && counts.live === 0,
      plan: TEMPLATE_COPY.noneOnChainPlan(liveThere, other.mainnetName, chain.mainnetName, other.name),
    };
  });
  const shapeGroups = shapeGroupsFor(subsectors)
    .filter((g) => !singleSubs.includes(g.subsector))
    .map((g) => ({
      key: g.subsector,
      heading: g.heading,
      options: g.options.map((o): ChipOption<ProductShape> => {
        const missing = missingFamilies(o.value, envRows);
        if (missing.length > 0) return { ...o, note: gateNote(missing) };
        if (SHAPE_FAMILIES[o.value].length === 0) {
          const { live, total } = templateChainCounts(templatesForShapes(TEMPLATE_CATALOG, [o.value], chainKey), chainKey);
          return total ? { ...o, note: TEMPLATE_COPY.chipNote(live, total, chain.mainnetName) } : o;
        }
        return o;
      }),
    }));
  const shapeGated = shapeGroups.some((g) => g.options.some((o) => missingFamilies(o.value, envRows).length > 0));

  return (
    <div className="space-y-6">
      <ChoiceCardGroups
        label={SECTOR_COPY.label}
        required
        info={SECTOR_COPY.hint}
        value={sectors}
        onChange={onSectors}
        groups={[{ key: "sectors", heading: SECTOR_COPY.label, options: SECTOR_OPTIONS }]}
        max={PROJECT_LIMITS.sectors.max}
      >
        {closedSectorLabels().length ? <p className="text-xs text-ink-400">{SECTOR_COPY.moreSoon(closedSectorLabels())}</p> : null}
      </ChoiceCardGroups>
      {sectors.includes("other") && (
        <TextField
          label={SECTOR_COPY.otherLabel}
          required={!subsectors.some((v) => SECTOR_SUBSECTORS.other.includes(v))}
          hint={SECTOR_COPY.otherHint}
          value={doc.sectorOther ?? ""}
          onChange={(v) => patch({ sectorOther: v })}
          max={PROJECT_LIMITS.sectorOther.max}
        />
      )}
      {subsectorGroups.length > 0 && (
        <ChoiceCardGroups
          label={SECTOR_COPY.subsectorLabel}
          required
          info={
            <>
              <span className="block">{SECTOR_COPY.subsectorHint}</span>
              {overlapHints.length > 0 ? <span className="mt-2 block">{overlapHints.join(" ")}</span> : null}
              {subsectorGated ? <span className="mt-2 block text-ink-400">{GATE_COPY.note(chain.short)}</span> : null}
            </>
          }
          value={subsectors}
          onChange={onSubsectors}
          groups={subsectorGroups}
          maxPerGroup={PROJECT_LIMITS.subsectors.max}
        />
      )}
      {showKit ? (
        <>
          {buildingLines.length ? (
            <div className="space-y-2">
              {shapeGroups.length === 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
                  {KIT_COPY.shapeLabel}
                  <InfoTip>{KIT_COPY.buildingHint}</InfoTip>
                </span>
              ) : null}
              <ul className="space-y-2">
                {buildingLines.map((b) => (
                  <li key={b.shape} className="rounded-xl border border-ink-700/60 bg-ink-950/50 px-3 py-2">
                    <p className="text-xs leading-relaxed text-ink-100">{b.line}</p>
                    {b.gateNote ? <p className="mt-1 text-xs text-ink-400">{b.gateNote}</p> : null}
                    {b.noTemplate ? (
                      <StatusChip tone="info" className="mt-2">
                        {TEMPLATE_COPY.noneOnChainNote(chain.mainnetName)}
                        <InfoTip label={TEMPLATE_COPY.noneOnChainAria} className="ml-0.5">
                          <span className="block">{TEMPLATE_COPY.noneOnChainDetail(chain.mainnetName)}</span>
                          <span className="mt-2 block text-ink-100">{b.plan}</span>
                        </InfoTip>
                      </StatusChip>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {shapeGroups.length > 0 ? (
            <ChipMultiSelectGroups
              label={KIT_COPY.shapeLabel}
              info={
                <>
                  <span className="block">{KIT_COPY.shapeHint}</span>
                  {buildingLines.length ? <span className="mt-2 block">{KIT_COPY.buildingHint}</span> : null}
                  {shapeGated ? <span className="mt-2 block text-ink-400">{GATE_COPY.note(chain.short)}</span> : null}
                </>
              }
              value={kitShapes(kit)}
              onChange={onShapes}
              max={KIT_LIMITS.shapes.max}
              groups={shapeGroups}
            />
          ) : null}
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
