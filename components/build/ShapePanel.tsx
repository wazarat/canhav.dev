"use client";

import { useEffect, useState } from "react";
import { ChevronDown, MoreHorizontal, Pencil, Plus, X } from "lucide-react";

import { ShapeIconPicker } from "@/components/build/ShapeIconPicker";
import { ShapeGlyph } from "@/components/build/shape-icons";
import { FeaturesBlock } from "@/components/ideation/kit/FeaturesBlock";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { Input } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Segmented } from "@/components/ui/Segmented";
import { BUILD_COPY } from "@/content/build";
import { checklistItemById, catalogStepIds } from "@/content/kits/checklists";
import { LANE_COPY, shapeBlurb, shapeLabel, shapeName } from "@/content/kits/copy";
import { featuresFor } from "@/content/kits/features";
import {
  KIT_LIMITS,
  PRODUCT_SHAPE_VALUES,
  type OwnShapeId,
  type ProjectKit,
  SHAPE_LANES,
  type ShapeId,
  type ShapeLane,
  allShapes,
  editOwnShape,
  isProductShape,
  laneOf,
  ownShapeOf,
  setOwnShapeSteps,
  setShapeLane,
  setShapeParagraph,
} from "@/lib/kits";
import { cn } from "@/lib/utils";

/** A shape's definition (M177, editable since M178): the team's own words, else our catalog blurb. */
function paragraphOf(kit: ProjectKit, shape: ShapeId): string {
  const own = ownShapeOf(kit, shape);
  if (own) return own.detail;
  return kit.shapeParagraphs?.[shape] ?? (isProductShape(shape) ? (shapeBlurb(shape) ?? "") : "");
}

/**
 * The picked shape (M177): its icon and colour, name, lane and paragraph,
 * the features it includes (a ticked feature adds the steps it gates), and
 * for a shape the team made, rename, remove and the catalog steps it picked.
 */
export function ShapePanel({
  kit,
  shape,
  onPatchKit,
  onRemoveShape,
  queued,
}: {
  kit: ProjectKit;
  shape: ShapeId;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** Removes an own shape; absent for ours, which change under Decisions. */
  onRemoveShape?: () => void;
  /** The open ideate request on this shape, with its cancel. */
  queued?: { at: string; onCancel: () => void } | null;
}) {
  const S = BUILD_COPY.shapes;
  const own = ownShapeOf(kit, shape);
  const para = paragraphOf(kit, shape);
  // Our features are per catalog shape; an own shape copied from one shows that shape's.
  const featureShape = isProductShape(shape) ? shape : own?.basedOn;
  const features = featureShape ? featuresFor([featureShape]) : [];
  // The list shows once a feature is ticked (M178); until then one link opens it.
  const ticked = features.filter((f) => kit.features?.includes(f.id)).length;
  const [showFeatures, setShowFeatures] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(para);
  const L = KIT_LIMITS.ownShapes;
  const saveParagraph = () => {
    if (own) onPatchKit(editOwnShape(kit, own.id, { detail: draft }));
    // Our blurb back as typed clears the override.
    else onPatchKit(setShapeParagraph(kit, shape, draft.trim() === (isProductShape(shape) ? shapeBlurb(shape) : "") ? "" : draft));
    setEditing(false);
  };
  return (
    <Card>
      <CardSection className="space-y-3">
        <div className="flex items-start gap-3">
          <ShapeIconPicker kit={kit} shape={shape} onPatchKit={onPatchKit} />
          <div className="min-w-0 flex-1">
            <OwnShapeHeader kit={kit} shape={shape} onPatchKit={onPatchKit} onRemoveShape={onRemoveShape} />
          </div>
          <Segmented<ShapeLane>
            size="sm"
            ariaLabel={LANE_COPY.title}
            value={laneOf(kit, shape)}
            onChange={(l) => onPatchKit(setShapeLane(kit, shape, l))}
            options={SHAPE_LANES.map((l) => ({ value: l, label: LANE_COPY.lanes[l].label }))}
          />
        </div>
        {editing ? (
          <div className="max-w-3xl space-y-2">
            <textarea
              autoFocus
              value={draft}
              maxLength={L.detailMax}
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={S.definition}
              className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-electric-500 focus:outline-none"
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={saveParagraph}>
                {S.save}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                {S.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex max-w-3xl items-start gap-3">
            <p className="flex-1 text-sm leading-relaxed text-ink-300">{para || LANE_COPY.noParagraph}</p>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setDraft(para);
                setEditing(true);
              }}
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" /> {S.editDefinition}
            </Button>
          </div>
        )}
        {featureShape && features.length && !ticked && !showFeatures ? (
          <button type="button" onClick={() => setShowFeatures(true)} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-ink-100">
            <Plus aria-hidden className="h-3.5 w-3.5" /> {S.addFeatures}
          </button>
        ) : null}
        {queued ? (
          <p className="text-xs text-ink-400">
            {S.queued(new Date(queued.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}{" "}
            <button type="button" onClick={queued.onCancel} className="hover:text-ink-50 hover:underline">
              {S.cancelQueue}
            </button>
          </p>
        ) : null}
      </CardSection>
      {featureShape && features.length && (ticked || showFeatures) ? (
        <CardSection>
          <FeaturesBlock shape={featureShape} features={features} kit={kit} onPatchKit={onPatchKit} />
        </CardSection>
      ) : null}
      {own ? (
        <CardSection>
          <OwnShapeSteps kit={kit} id={own.id} onPatchKit={onPatchKit} />
        </CardSection>
      ) : null}
    </Card>
  );
}

/** The header line: the shape's name, and for one the team made, rename and remove. */
function OwnShapeHeader({
  kit,
  shape,
  onPatchKit,
  onRemoveShape,
}: {
  kit: ProjectKit;
  shape: ShapeId;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  onRemoveShape?: () => void;
}) {
  const S = BUILD_COPY.shapes;
  const own = ownShapeOf(kit, shape);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(own?.title ?? "");
  const [confirm, setConfirm] = useState(false);
  const L = KIT_LIMITS.ownShapes;
  if (own && editing)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input value={title} maxLength={L.titleMax} onChange={(e) => setTitle(e.target.value)} aria-label={S.name} />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            disabled={title.trim().length < L.titleMin}
            onClick={() => {
              onPatchKit(editOwnShape(kit, own.id as OwnShapeId, { title }));
              setEditing(false);
            }}
          >
            {S.save}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            {S.cancel}
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-base font-semibold text-ink-50">{shapeName(kit, shape)}</h2>
        {own ? <p className="mt-0.5 text-xs text-ink-500">{[S.yours, own.basedOn ? S.basedOn(shapeLabel(own.basedOn) ?? own.basedOn) : null].filter(Boolean).join(" · ")}</p> : null}
      </div>
      {own && onRemoveShape ? (
        confirm ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
            {S.removeConfirm}
            <Button size="sm" variant="outline" onClick={onRemoveShape}>
              {S.removeYes}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              {S.cancel}
            </Button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setTitle(own.title);
                setEditing(true);
              }}
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" /> {S.rename}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
              <X aria-hidden className="h-3.5 w-3.5" /> {S.remove}
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

/** The catalog steps an own shape picked, and the menu that picks more from any of our shapes. */
function OwnShapeSteps({ kit, id, onPatchKit }: { kit: ProjectKit; id: OwnShapeId; onPatchKit: (partial: Partial<ProjectKit>) => void }) {
  const S = BUILD_COPY.shapes;
  const own = ownShapeOf(kit, id)!;
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const picked = new Set(own.steps);
  const sources = [...(own.basedOn ? [own.basedOn] : []), ...PRODUCT_SHAPE_VALUES.filter((s) => s !== own.basedOn)];
  const groups = sources
    .map((s) => ({
      shape: s,
      items: catalogStepIds(s)
        .filter((sid) => !picked.has(sid))
        .map((sid) => checklistItemById(sid)!)
        .filter((i) => i && (!q || i.title.toLowerCase().includes(q))),
    }))
    .filter((g) => g.items.length);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-xs font-medium text-ink-200">
          {S.steps} <span className="text-ink-500">{own.steps.length}</span>
          <InfoTip label={S.steps}>{S.stepsHint}</InfoTip>
        </p>
        <Menu
          align="right"
          width="w-96 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto"
          trigger={({ toggle, open }) => (
            <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex items-center gap-1 text-xs text-ink-300 transition-colors hover:text-ink-100">
              <Plus aria-hidden className="h-3.5 w-3.5" /> {S.addSteps}
            </button>
          )}
        >
          <div className="px-3 py-2">
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={BUILD_COPY.shapes.filter} aria-label={BUILD_COPY.shapes.filter} className="h-8 text-xs" />
          </div>
          {groups.slice(0, 30).map((g) => (
            <div key={g.shape} className="border-t border-ink-700/40 py-1">
              <p className="px-3.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">{S.stepsFrom(shapeLabel(g.shape) ?? g.shape)}</p>
              {g.items.slice(0, 25).map((i) => (
                <MenuItem key={i.id} onSelect={() => onPatchKit(setOwnShapeSteps(kit, id, [i.id]))} className="py-1.5">
                  <span className="truncate">{i.title}</span>
                </MenuItem>
              ))}
            </div>
          ))}
        </Menu>
      </div>
      {own.steps.length === 0 ? (
        <p className="text-xs text-ink-500">{S.stepsNone}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {own.steps.map((sid) => {
            const item = checklistItemById(sid);
            if (!item) return null;
            return (
              <li key={sid} className="inline-flex items-center gap-1 rounded-md border border-ink-700/60 px-2 py-1 text-xs text-ink-200">
                {item.title}
                <button type="button" aria-label={BUILD_COPY.shapes.removeFromShape} onClick={() => onPatchKit(setOwnShapeSteps(kit, id, [], [sid]))} className="text-ink-500 hover:text-ink-100">
                  <X aria-hidden className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
