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
} from "@/lib/kits";
import { cn } from "@/lib/utils";

const DRAG = "application/x-canhav-shape";

/** A shape's paragraph (M177): ours from the catalog blurb, an own shape from what the team wrote. */
function paragraphOf(kit: ProjectKit, shape: ShapeId): string {
  const own = ownShapeOf(kit, shape);
  if (own) return own.detail;
  return isProductShape(shape) ? (shapeBlurb(shape) ?? "") : "";
}

/**
 * The shapes sorted into lanes (M177), at the top of the Build tab: Core
 * (part of the product), Exploring (being ideated) and Later (to add and
 * test later). Each card is a shape with its icon and paragraph; a card
 * moves by dragging or its menu, and a click picks the shape, which filters
 * the steps and opens its panel. The lanes fold away, remembered on this
 * browser, to go straight to the milestones.
 */
export function ShapeLanes({
  kit,
  selected,
  onSelect,
  onPatchKit,
  projectId,
}: {
  kit: ProjectKit;
  selected: ShapeId | "";
  onSelect: (shape: ShapeId | "") => void;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  projectId: string;
}) {
  const S = BUILD_COPY.shapes;
  const shapes = allShapes(kit);
  const lanes: Record<ShapeLane, ShapeId[]> = { core: [], exploring: [], later: [] };
  for (const s of shapes) lanes[laneOf(kit, s)].push(s);
  const [over, setOver] = useState<ShapeLane | null>(null);
  const foldKey = `canhav:lanes-fold:${projectId}`;
  // Read after mount, so the server render and the first client render agree.
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    try {
      setFolded(window.localStorage.getItem(foldKey) === "1");
    } catch {
      // No storage, so the lanes start open.
    }
  }, [foldKey]);
  const toggleFold = () =>
    setFolded((f) => {
      try {
        if (f) window.localStorage.removeItem(foldKey);
        else window.localStorage.setItem(foldKey, "1");
      } catch {
        // The fold is a convenience; without storage it resets on reload.
      }
      return !f;
    });
  const move = (shape: ShapeId, lane: ShapeLane) => onPatchKit(setShapeLane(kit, shape, lane));

  return (
    <Card>
      <CardSection className="flex items-center justify-between gap-3 py-3">
        <p className="text-sm font-medium text-ink-100">
          {LANE_COPY.title} {folded ? <span className="ml-1 text-xs font-normal text-ink-500">{S.folded(lanes.core.length, lanes.exploring.length, lanes.later.length)}</span> : null}
        </p>
        <button
          type="button"
          onClick={toggleFold}
          aria-expanded={!folded}
          aria-label={folded ? S.unfold : S.fold}
          title={folded ? S.unfold : S.fold}
          className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-800/60 hover:text-ink-100"
        >
          <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", !folded && "rotate-180")} />
        </button>
      </CardSection>
      {folded ? null : (
        <CardSection>
          <div className="grid gap-3 md:grid-cols-3">
            {SHAPE_LANES.map((lane) => (
              <div
                key={lane}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(DRAG)) return;
                  e.preventDefault();
                  setOver(lane);
                }}
                onDragLeave={() => setOver((l) => (l === lane ? null : l))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const shape = e.dataTransfer.getData(DRAG) as ShapeId;
                  if (shape && shapes.includes(shape) && laneOf(kit, shape) !== lane) move(shape, lane);
                }}
                className={cn("flex min-h-[8rem] flex-col rounded-lg border border-ink-700/40 bg-ink-950/40 p-2", over === lane && "border-ink-500")}
              >
                <div className="flex items-baseline justify-between px-1.5 pb-2">
                  <span className="text-xs font-medium text-ink-100">
                    {LANE_COPY.lanes[lane].label} <span className="text-ink-500">{lanes[lane].length}</span>
                  </span>
                  <span className="text-[11px] text-ink-500">{LANE_COPY.lanes[lane].hint}</span>
                </div>
                <ul className="flex-1 space-y-1.5">
                  {lanes[lane].map((shape) => {
                    const para = paragraphOf(kit, shape);
                    return (
                      <li
                        key={shape}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(DRAG, shape);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className={cn(
                          "cursor-grab rounded-md border bg-ink-900 px-2.5 py-2 active:cursor-grabbing",
                          selected === shape ? "border-ink-400" : "border-ink-700/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => onSelect(selected === shape ? "" : shape)} aria-pressed={selected === shape} className="min-w-0 flex-1 text-left">
                            <span className="flex items-center gap-1.5 text-sm leading-snug text-ink-50">
                              <ShapeGlyph kit={kit} shape={shape} />
                              <span className="truncate">{shapeName(kit, shape)}</span>
                            </span>
                            {para ? <span className="mt-1 line-clamp-3 block text-[11px] leading-relaxed text-ink-400">{para}</span> : null}
                          </button>
                          <Menu
                            align="right"
                            width="w-48"
                            trigger={({ toggle, open }) => (
                              <button type="button" onClick={toggle} aria-expanded={open} aria-label={shapeName(kit, shape)} className="rounded p-0.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100">
                                <MoreHorizontal aria-hidden className="h-4 w-4" />
                              </button>
                            )}
                          >
                            {SHAPE_LANES.filter((l) => l !== lane).map((l) => (
                              <MenuItem key={l} onSelect={() => move(shape, l)}>
                                {LANE_COPY.moveTo(LANE_COPY.lanes[l].label)}
                              </MenuItem>
                            ))}
                          </Menu>
                        </div>
                      </li>
                    );
                  })}
                  {lanes[lane].length === 0 ? <li className="px-1.5 text-[11px] text-ink-500">{LANE_COPY.empty}</li> : null}
                </ul>
              </div>
            ))}
          </div>
        </CardSection>
      )}
    </Card>
  );
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
        <p className="max-w-3xl text-sm leading-relaxed text-ink-300">{para || LANE_COPY.noParagraph}</p>
        {queued ? (
          <p className="text-xs text-ink-400">
            {S.queued(new Date(queued.at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}{" "}
            <button type="button" onClick={queued.onCancel} className="hover:text-ink-50 hover:underline">
              {S.cancelQueue}
            </button>
          </p>
        ) : null}
      </CardSection>
      {featureShape && features.length ? (
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

/** The header line: the shape's name, and for one the team made, rename (name and paragraph) and remove. */
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
  const [detail, setDetail] = useState(own?.detail ?? "");
  const [confirm, setConfirm] = useState(false);
  const L = KIT_LIMITS.ownShapes;
  if (own && editing)
    return (
      <div className="grid gap-2 sm:grid-cols-[16rem_minmax(0,1fr)_auto] sm:items-start">
        <Input value={title} maxLength={L.titleMax} onChange={(e) => setTitle(e.target.value)} aria-label={S.name} />
        <textarea
          value={detail}
          maxLength={L.detailMax}
          rows={2}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={S.wantsPlaceholder}
          aria-label={S.wants}
          className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-electric-500 focus:outline-none"
        />
        <div className="flex gap-1.5">
          <Button
            size="sm"
            disabled={title.trim().length < L.titleMin}
            onClick={() => {
              onPatchKit(editOwnShape(kit, own.id as OwnShapeId, { title, detail }));
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
                setDetail(own.detail);
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
