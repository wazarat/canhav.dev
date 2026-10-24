"use client";

import { TextField } from "@/components/ideation/TextField";
import { ChipMultiSelectGroups } from "@/components/ui/ChipGroup";
import { ChoiceCardGroups } from "@/components/ui/ChoiceCard";
import type { SectorChoice } from "@/components/studio/new/SectorCards";
import { SECTOR_COPY, SECTOR_OPTIONS, optionLabel, subsectorOptionsFor } from "@/content/ideation";
import { KIT_COPY, shapeBuildingPhrase, shapeGroupsFor } from "@/content/kits/copy";
import { NEW_PROJECT_COPY } from "@/content/studio-new";
import { PROJECT_LIMITS } from "@/lib/ideation";
import { KIT_LIMITS, type ProductShape, impliedShapesFor, shapesFor } from "@/lib/kits";
import type { Subsector } from "@/lib/sectors";

/**
 * The building step of the new project flow (M130): what it does in one
 * line, the subsector cards of the chosen sector and, where a subsector
 * offers more than one shape, the shape chips. A subsector with one shape
 * names it as a sentence, the way Decisions does. Everything is optional;
 * with it filled the project lands with Build steps on day one, without it
 * the agent can classify the project from the description over MCP.
 */
export function BuildingStep({
  sector,
  subsectors,
  shapes,
  whatItDoes,
  onChange,
}: {
  sector: SectorChoice;
  subsectors: Subsector[];
  shapes: ProductShape[];
  whatItDoes: string;
  onChange: (p: Partial<{ subsectors: Subsector[]; shapes: ProductShape[]; whatItDoes: string }>) => void;
}) {
  const C = NEW_PROJECT_COPY.building;
  const chosen = sector && sector !== "undecided" ? sector : null;
  const options = chosen ? subsectorOptionsFor(chosen) : [];
  const implied = impliedShapesFor(subsectors);
  const groups = shapeGroupsFor(subsectors)
    .filter((g) => shapesFor([g.subsector]).length > 1)
    .map((g) => ({ key: g.subsector, heading: g.heading, options: g.options }));
  return (
    <div className="space-y-6">
      <TextField
        label={C.whatItDoesLabel}
        hint={C.whatItDoesHint}
        value={whatItDoes}
        onChange={(v) => onChange({ whatItDoes: v })}
        max={PROJECT_LIMITS.whatItDoes.max}
        rows={3}
        placeholder={C.whatItDoesPlaceholder}
      />
      {chosen && options.length ? (
        <ChoiceCardGroups
          label={SECTOR_COPY.subsectorLabel}
          info={C.subsectorHint}
          value={subsectors}
          onChange={(v) => onChange({ subsectors: v, shapes: shapes.filter((s) => shapesFor(v).includes(s)) })}
          groups={[{ key: chosen, heading: SECTOR_OPTIONS.find((o) => o.value === chosen)?.title ?? optionLabel(SECTOR_OPTIONS, chosen), options }]}
          maxPerGroup={PROJECT_LIMITS.subsectors.max}
        />
      ) : (
        <p className="text-xs text-ink-500">{C.agentHint}</p>
      )}
      {implied.length ? (
        <ul className="space-y-2">
          {implied.map((shape) => (
            <li key={shape} className="rounded-xl border border-ink-700/60 bg-ink-950/50 px-3 py-2 text-xs leading-relaxed text-ink-100">
              {KIT_COPY.buildingLine(shapeBuildingPhrase(shape), "")}
            </li>
          ))}
        </ul>
      ) : null}
      {groups.length ? (
        <ChipMultiSelectGroups label={KIT_COPY.shapeLabel} info={KIT_COPY.shapeHint} value={shapes} onChange={(v) => onChange({ shapes: v })} max={KIT_LIMITS.shapes.max} groups={groups} />
      ) : null}
    </div>
  );
}
