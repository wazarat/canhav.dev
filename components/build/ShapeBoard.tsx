"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { Input } from "@/components/ui/Input";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { BUILD_COPY } from "@/content/build";
import { checklistItemById, catalogStepIds } from "@/content/kits/checklists";
import { BOARD_COPY, shapeLabel, shapeName } from "@/content/kits/copy";
import { type BoardItem, boardFor, libraryFor, placeCard, placeIdea, removeCard, removeIdea } from "@/lib/board";
import type { ProjectChain } from "@/lib/chains";
import {
  BOARD_LANES,
  type BoardLane,
  KIT_LIMITS,
  PRODUCT_SHAPE_VALUES,
  type OwnShapeId,
  type ProjectKit,
  type ShapeId,
  editOwnShape,
  ownShapeOf,
  setOwnShapeSteps,
} from "@/lib/kits";
import { cn } from "@/lib/utils";

const DRAG = "application/x-canhav-card";

/**
 * One shape's board (M176), shown on the Build tab once a shape is picked:
 * Core, Exploring and Later, the way a Linear project board reads. Cards
 * move by their menu or by dragging between lanes; each lane adds from the
 * library (features, resources, contract templates) or a line of the
 * team's own. A shape the team made also names itself here and holds the
 * catalog steps it picked.
 */
export function ShapeBoard({
  kit,
  shape,
  chain,
  onPatchKit,
  onRemoveShape,
}: {
  kit: ProjectKit;
  shape: ShapeId;
  chain: ProjectChain;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
  /** Removes an own shape; absent for ours, which change under Decisions. */
  onRemoveShape?: () => void;
}) {
  const B = BOARD_COPY;
  const lanes = useMemo(() => boardFor(kit, shape), [kit, shape]);
  const library = useMemo(() => libraryFor(kit, shape, chain), [kit, shape, chain]);
  const own = ownShapeOf(kit, shape);
  const [over, setOver] = useState<BoardLane | null>(null);

  const move = (item: BoardItem, lane: BoardLane) =>
    onPatchKit(item.kind === "own" ? placeIdea(kit, shape, item.id, lane) : placeCard(kit, shape, item.kind, item.id, lane));
  const remove = (item: BoardItem) => onPatchKit(item.kind === "own" ? removeIdea(kit, shape, item.id) : removeCard(kit, shape, item.kind, item.id));
  const all = Object.values(lanes).flat();

  return (
    <Card>
      <CardSection className="space-y-1">
        <OwnShapeHeader kit={kit} shape={shape} onPatchKit={onPatchKit} onRemoveShape={onRemoveShape} />
        <p className="inline-flex items-center gap-1 text-xs text-ink-400">
          {B.title}
          <InfoTip label={B.title}>{B.hint}</InfoTip>
        </p>
      </CardSection>
      <CardSection>
        <div className="grid gap-3 md:grid-cols-3">
          {BOARD_LANES.map((lane) => (
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
                const item = all.find((i) => i.key === e.dataTransfer.getData(DRAG));
                if (item && item.lane !== lane) move(item, lane);
              }}
              className={cn("flex min-h-[10rem] flex-col rounded-lg border border-ink-700/40 bg-ink-950/40 p-2", over === lane && "border-ink-500")}
            >
              <div className="flex items-baseline justify-between px-1.5 pb-2">
                <span className="text-xs font-medium text-ink-100">
                  {B.lanes[lane].label} <span className="text-ink-500">{lanes[lane].length}</span>
                </span>
                <span className="text-[11px] text-ink-500">{B.lanes[lane].hint}</span>
              </div>
              <ul className="flex-1 space-y-1.5">
                {lanes[lane].map((item) => (
                  <li
                    key={item.key}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG, item.key);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="group cursor-grab rounded-md border border-ink-700/60 bg-ink-900 px-2.5 py-2 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-ink-50">{item.title}</p>
                        <p className="mt-0.5 text-[11px] text-ink-500">{B.kinds[item.kind]}</p>
                      </div>
                      <Menu
                        align="right"
                        width="w-48"
                        trigger={({ toggle, open }) => (
                          <button type="button" onClick={toggle} aria-expanded={open} aria-label={item.title} className="rounded p-0.5 text-ink-500 transition-colors hover:bg-ink-800/60 hover:text-ink-100">
                            <MoreHorizontal aria-hidden className="h-4 w-4" />
                          </button>
                        )}
                      >
                        {BOARD_LANES.filter((l) => l !== lane).map((l) => (
                          <MenuItem key={l} onSelect={() => move(item, l)}>
                            {B.moveTo(B.lanes[l].label)}
                          </MenuItem>
                        ))}
                        <MenuItem onSelect={() => remove(item)}>{B.remove}</MenuItem>
                      </Menu>
                    </div>
                  </li>
                ))}
                {lanes[lane].length === 0 ? <li className="px-1.5 text-[11px] text-ink-500">{B.empty}</li> : null}
              </ul>
              <LaneAdd kit={kit} shape={shape} lane={lane} library={library} onPatchKit={onPatchKit} />
            </div>
          ))}
        </div>
      </CardSection>
      {own ? (
        <CardSection>
          <OwnShapeSteps kit={kit} id={own.id} onPatchKit={onPatchKit} />
        </CardSection>
      ) : null}
    </Card>
  );
}

/** A lane's Add: the library grouped, with a filter, or a line of the team's own. */
function LaneAdd({
  kit,
  shape,
  lane,
  library,
  onPatchKit,
}: {
  kit: ProjectKit;
  shape: ShapeId;
  lane: BoardLane;
  library: ReturnType<typeof libraryFor>;
  onPatchKit: (partial: Partial<ProjectKit>) => void;
}) {
  const B = BOARD_COPY;
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const groups = library
    .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.title.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length);
  const L = KIT_LIMITS.ideas;
  const save = () => {
    if (text.trim().length < L.textMin) return;
    onPatchKit(placeIdea(kit, shape, text, lane));
    setText("");
    setWriting(false);
  };
  if (writing)
    return (
      <div className="mt-2 space-y-1.5">
        <Input
          autoFocus
          value={text}
          maxLength={L.textMax}
          placeholder={B.ownPlaceholder}
          aria-label={B.writeOwn}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setWriting(false);
          }}
          className="h-8 text-xs"
        />
        <div className="flex gap-1.5">
          <Button size="sm" disabled={text.trim().length < L.textMin} onClick={save}>
            {B.add}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setWriting(false)}>
            {BUILD_COPY.shapes.cancel}
          </Button>
        </div>
      </div>
    );
  return (
    <Menu
      align="left"
      width="w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto"
      className="mt-2"
      trigger={({ toggle, open }) => (
        <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex items-center gap-1 px-1.5 text-xs text-ink-400 transition-colors hover:text-ink-100">
          <Plus aria-hidden className="h-3.5 w-3.5" /> {B.add}
        </button>
      )}
    >
      <MenuItem onSelect={() => setWriting(true)}>
        <Pencil aria-hidden className="h-3.5 w-3.5 text-ink-400" /> {B.writeOwn}
      </MenuItem>
      <div className="border-t border-ink-700/40 px-3 py-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={B.search} aria-label={B.search} className="h-8 text-xs" />
      </div>
      {groups.length === 0 ? <p className="px-3.5 py-2 text-xs text-ink-500">{B.nothingLeft}</p> : null}
      {groups.map((g) => (
        <div key={`${g.kind}:${g.from ?? ""}`} className="border-t border-ink-700/40 py-1">
          <p className="px-3.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            {g.kind === "feature" && g.from && g.from !== shape ? B.featuresFrom(shapeLabel(g.from) ?? g.from) : B.libraryTitles[g.kind]}
          </p>
          {g.items.slice(0, 40).map((i) => (
            <MenuItem key={i.id} onSelect={() => onPatchKit(placeCard(kit, shape, g.kind, i.id, lane))} className="py-1.5">
              <span className="truncate">{i.title}</span>
            </MenuItem>
          ))}
        </div>
      ))}
    </Menu>
  );
}

/** The header line: the shape's name, and for one the team made its description, rename and remove. */
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
      <div className="grid gap-2 sm:grid-cols-[16rem_minmax(0,1fr)_auto] sm:items-center">
        <Input value={title} maxLength={L.titleMax} onChange={(e) => setTitle(e.target.value)} aria-label={S.name} />
        <Input value={detail} maxLength={L.detailMax} onChange={(e) => setDetail(e.target.value)} placeholder={S.detailPlaceholder} aria-label={S.detail} />
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
        {own ? (
          <p className="mt-0.5 text-xs text-ink-400">
            {[S.yours, own.basedOn ? S.basedOn(shapeLabel(own.basedOn) ?? own.basedOn) : null, own.detail || null].filter(Boolean).join(" · ")}
          </p>
        ) : null}
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
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={BOARD_COPY.search} aria-label={BOARD_COPY.search} className="h-8 text-xs" />
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
                <button type="button" aria-label={BOARD_COPY.remove} onClick={() => onPatchKit(setOwnShapeSteps(kit, id, [], [sid]))} className="text-ink-500 hover:text-ink-100">
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
