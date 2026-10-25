"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { TextField } from "@/components/ideation/TextField";
import { Button } from "@/components/ui/Button";
import { ChipMultiSelectGroups, type ChipOption } from "@/components/ui/ChipGroup";
import { ChoiceCardGroups } from "@/components/ui/ChoiceCard";
import { MetaLine } from "@/components/ui/MetaLine";
import { Segmented } from "@/components/ui/Segmented";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { BUILD_COPY } from "@/content/build";
import { SECTOR_COPY, SECTOR_OPTIONS, subsectorLabel, subsectorOptionsFor } from "@/content/ideation";
import { sectionsFor } from "@/content/kits/checklists";
import { offeredShapes, shapeGroupsFor, shapeLabel, shapeName } from "@/content/kits/copy";
import { MILESTONES, groupsByMilestone } from "@/lib/build-milestones";
import { projectChainOf } from "@/lib/chains";
import { sectorRemoval, sectorSave } from "@/lib/classify";
import { PROJECT_LIMITS, type ProjectDoc } from "@/lib/ideation";
import { type ProductShape, impliedShapesFor, kitShapes } from "@/lib/kits";
import { SECTOR_SUBSECTORS, type Sector, type Subsector } from "@/lib/sectors";
import { reachableTemplatesFor } from "@/lib/template-reach";
import { cn } from "@/lib/utils";

const F = SECTOR_COPY.flow;
type Step = Exclude<keyof typeof F.steps, "sector">;
const STEPS: Step[] = ["subsectors", "build", "steps", "review"];

export function sectorTitle(sector: Sector): string {
  return SECTOR_OPTIONS.find((o) => o.value === sector)?.label ?? sector;
}

/** Our modules a sector holds on the project (M186), from its picked subsectors. */
export function sectorModules(doc: Pick<ProjectDoc, "subsectors" | "kit">, sector: Sector): ProductShape[] {
  const subs = (doc.subsectors ?? []).filter((s) => (SECTOR_SUBSECTORS[sector] ?? []).includes(s));
  return kitShapes(doc.kit).filter((m) => offeredShapes(subs).includes(m));
}

/** A picked sector named by its modules (M186), else by the sector. */
export function moduleTitle(doc: Pick<ProjectDoc, "subsectors" | "kit">, sector: Sector): string {
  const mods = sectorModules(doc, sector);
  return mods.length ? mods.map((m) => shapeName(doc.kit, m)).join(", ") : sectorTitle(sector);
}

/** The modules and done steps a save or a delete takes with it, as one phrase. */
function lossPhrase(modules: readonly ProductShape[], done: number, templates: number): string {
  const parts = [
    ...(modules.length ? [modules.map((m) => shapeLabel(m) ?? m).join(", ")] : []),
    ...(done ? [done === 1 ? "1 step marked done" : `${done} steps marked done`] : []),
    ...(templates ? [templates === 1 ? "1 template decision" : `${templates} template decisions`] : []),
  ];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
}

function Shell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ onClose, containerRef });
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-8 md:py-14">
      <div className="fixed inset-0 bg-ink-950/80" onClick={onClose} />
      <div ref={containerRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl rounded-xl border border-ink-700/60 bg-ink-900 focus:outline-none">
        <div className="flex items-start justify-between gap-4 border-b border-ink-700/40 px-5 py-4 md:px-6">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink-50">{title}</h2>
          <button type="button" onClick={onClose} aria-label={F.close} className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-5 md:px-6">{children}</div>
        <div className="flex flex-wrap items-center gap-2 border-t border-ink-700/40 px-5 py-4 md:px-6">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Add or edit one sector (M185). Four steps: the subsectors, what the team
 * builds under them (its note and the modules), the build steps those
 * modules bring by milestone with the templates that fit, then a confirm.
 * Nothing is written until Save. An edit that drops a module says what
 * goes with it before Save.
 */
export function SectorDialog({
  doc,
  sector,
  cap,
  onClose,
  patch,
  onBack,
}: {
  doc: ProjectDoc;
  sector: Sector;
  cap: number;
  onClose: () => void;
  patch: (p: Partial<ProjectDoc>) => void;
  /** Back to the sector pick, when the pop-up started there (M186). */
  onBack?: () => void;
}) {
  // An edit opens from a module's card; a pick of a sector already on the project adds to it.
  const editing = !onBack;
  const name = sectorTitle(sector);
  const mine = SECTOR_SUBSECTORS[sector] ?? [];
  const hasSubs = subsectorOptionsFor(sector).length > 0;
  const [step, setStep] = useState<Step>(hasSubs ? "subsectors" : "build");
  const [subs, setSubs] = useState<Subsector[]>((doc.subsectors ?? []).filter((s) => mine.includes(s)));
  const [note, setNote] = useState(doc.sectorNotes?.[sector] ?? "");
  const [other, setOther] = useState(doc.sectorOther ?? "");
  const offered = useMemo(() => offeredShapes(subs), [subs]);
  const implied = useMemo(() => impliedShapesFor(subs), [subs]);
  const [picked, setPicked] = useState<ProductShape[]>(() => kitShapes(doc.kit).filter((s) => offeredShapes((doc.subsectors ?? []).filter((x) => mine.includes(x))).includes(s)));
  const shapes = useMemo(() => [...new Set([...implied, ...picked.filter((s) => offered.includes(s))])], [implied, picked, offered]);

  // The modules other sectors hold count against the cap with the team's own.
  const offeredBefore = offeredShapes((doc.subsectors ?? []).filter((s) => mine.includes(s)));
  const othersHeld = kitShapes(doc.kit).filter((s) => !offered.includes(s) && !offeredBefore.includes(s)).length;
  const room = Math.max(0, cap - (doc.kit?.ownShapes?.length ?? 0) - othersHeld);
  const groups = shapeGroupsFor(subs).map((g) => ({
    key: g.subsector,
    heading: g.heading,
    options: g.options.map((o): ChipOption<ProductShape> => (implied.includes(o.value) ? { ...o, note: F.modulesFixed } : o)),
  }));
  const byMilestone = useMemo(() => groupsByMilestone(sectionsFor(shapes)), [shapes]);
  const stepTotal = MILESTONES.reduce((n, m) => n + byMilestone[m].length, 0);
  const templates = useMemo(() => (shapes.length ? reachableTemplatesFor(shapes, projectChainOf(doc), {}).items.length : 0), [shapes, doc]);

  const input = { sector, subsectors: subs, shapes, note, ...(sector === "other" ? { other } : {}) };
  const result = useMemo(() => sectorSave(doc, input, cap), [doc, subs, shapes, note, other, cap]); // eslint-disable-line react-hooks/exhaustive-deps
  const loses = lossPhrase(result.modules, result.done, result.templates);

  const blocked = hasSubs && subs.length === 0;
  const at = STEPS.indexOf(step);
  const order = hasSubs ? STEPS : STEPS.slice(1);
  const pos = order.indexOf(step);

  return (
    <Shell
      title={editing ? F.dialogEdit(moduleTitle(doc, sector)) : F.dialogDefine}
      onClose={onClose}
      footer={
        <>
          {pos > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => setStep(order[pos - 1])}>
              {F.back}
            </Button>
          ) : onBack ? (
            <Button size="sm" variant="ghost" onClick={onBack}>
              {F.back}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={onClose}>
              {F.cancel}
            </Button>
          )}
          <span className="flex-1" />
          {step === "review" ? (
            <Button
              size="sm"
              disabled={blocked}
              onClick={() => {
                patch(result.patch);
                onClose();
              }}
            >
              {editing ? F.save : F.addModule}
            </Button>
          ) : (
            <Button size="sm" disabled={blocked} onClick={() => setStep(order[pos + 1])}>
              {F.next}
            </Button>
          )}
        </>
      }
    >
      <p className="text-xs leading-relaxed text-ink-400">{F.reassure}</p>
      <Segmented<Step | "sector">
        size="sm"
        role="tablist"
        value={step}
        onChange={(v) => (v === "sector" ? onBack?.() : setStep(v))}
        ariaLabel={editing ? F.dialogEdit(moduleTitle(doc, sector)) : F.dialogDefine}
        options={[
          ...(onBack ? [{ value: "sector" as const, label: `1. ${F.steps.sector} ${name}` }] : []),
          ...order.map((s, i) => ({ value: s, label: `${i + (onBack ? 2 : 1)}. ${F.steps[s]}`, disabled: blocked && STEPS.indexOf(s) > at && s !== "subsectors" })),
        ]}
      />

      {step === "subsectors" ? (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-ink-400">{F.subsectorsLead}</p>
          <ChoiceCardGroups
            label={SECTOR_COPY.subsectorLabel}
            value={subs}
            onChange={setSubs}
            groups={[{ key: sector, heading: name, options: subsectorOptionsFor(sector) }]}
            maxPerGroup={PROJECT_LIMITS.subsectors.max}
          />
          {blocked ? <p className="text-xs text-ink-500">{F.subsectorPick}</p> : null}
        </div>
      ) : null}

      {step === "build" ? (
        <div className="space-y-4">
          {!hasSubs ? <p className="text-xs leading-relaxed text-ink-400">{F.subsectorsNone}</p> : null}
          {sector === "other" ? (
            <TextField label={SECTOR_COPY.otherLabel} hint={SECTOR_COPY.otherHint} value={other} onChange={setOther} max={PROJECT_LIMITS.sectorOther.max} />
          ) : null}
          <TextField label={F.noteLabel(name)} hint={F.noteHint} value={note} onChange={setNote} max={PROJECT_LIMITS.sectorNote.max} placeholder={F.notePlaceholder} />
          {hasSubs ? (
            groups.length ? (
              <ChipMultiSelectGroups
                label={F.modulesLabel}
                info={F.modulesLead}
                value={shapes}
                onChange={(v) => setPicked([...new Set([...implied, ...v])])}
                max={Math.max(room, implied.length)}
                groups={groups}
              />
            ) : (
              <p className="text-xs text-ink-500">{F.modulesNone}</p>
            )
          ) : null}
        </div>
      ) : null}

      {step === "steps" ? (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-ink-400">{F.stepsLead}</p>
          {stepTotal === 0 ? (
            <p className="text-xs text-ink-500">{F.stepsNone}</p>
          ) : (
            MILESTONES.filter((m) => byMilestone[m].length).map((m) => (
              <div key={m} className="space-y-1.5">
                <p className="text-xs font-medium text-ink-200">
                  {BUILD_COPY.milestones[m].label} <span className="font-normal text-ink-500">· {F.stepCount(byMilestone[m].length)}</span>
                </p>
                <ul className="space-y-1">
                  {byMilestone[m].map((g) => (
                    <li key={g.key} className="text-xs leading-relaxed text-ink-300">
                      {g.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
          <p className="text-xs text-ink-400">{F.templates(templates)}</p>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-ink-400">{F.reviewLead}</p>
          <dl className="space-y-2 text-sm">
            {hasSubs ? (
              <div>
                <dt className="text-xs text-ink-500">{F.reviewSubsectors}</dt>
                <dd className="text-ink-100">{subs.length ? subs.map(subsectorLabel).join(", ") : F.noneYet}</dd>
              </div>
            ) : null}
            {hasSubs ? (
              <div>
                <dt className="text-xs text-ink-500">{F.reviewModules}</dt>
                <dd className="text-ink-100">{shapes.length ? shapes.map((s) => shapeLabel(s) ?? s).join(", ") : F.noneYet}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-ink-500">{F.reviewNote}</dt>
              <dd className="text-ink-100">{note.trim() || F.noneYet}</dd>
            </div>
          </dl>
          <MetaLine items={[F.reviewSteps(stepTotal), F.templates(templates).split(".")[0]]} />
          {loses ? <p className="text-xs text-rose-400">{F.loses(loses)}</p> : null}
        </div>
      ) : null}
    </Shell>
  );
}

/**
 * Define a module (M186): the pop-up behind Add a new feature or product.
 * It starts with the six sectors; a sector already on the project opens
 * with its picks so the team adds to it, then the sector's own steps follow.
 */
export function ModuleDialog({ doc, cap, onClose, patch }: { doc: ProjectDoc; cap: number; onClose: () => void; patch: (p: Partial<ProjectDoc>) => void }) {
  const [sector, setSector] = useState<Sector | null>(null);
  const [chosen, setChosen] = useState(false);
  const picked = doc.sectors ?? (doc.sector ? [doc.sector] : []);
  if (chosen && sector) return <SectorDialog key={sector} doc={doc} sector={sector} cap={cap} onClose={onClose} patch={patch} onBack={() => setChosen(false)} />;
  return (
    <Shell
      title={F.dialogDefine}
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {F.cancel}
          </Button>
          <span className="flex-1" />
          <Button size="sm" disabled={!sector} onClick={() => setChosen(true)}>
            {F.next}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-ink-400">{F.reassure}</p>
      <p className="text-xs leading-relaxed text-ink-400">{F.sectorLead}</p>
      <ul className="space-y-2" role="radiogroup" aria-label={F.steps.sector}>
        {SECTOR_OPTIONS.map((o) => (
          <li key={o.value}>
            <button
              type="button"
              role="radio"
              aria-checked={sector === o.value}
              disabled={o.available === false}
              onClick={() => setSector(o.value)}
              onDoubleClick={() => {
                setSector(o.value);
                setChosen(true);
              }}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                sector === o.value ? "border-electric-500 bg-ink-800/60" : "border-ink-700/60 hover:border-ink-500",
              )}
            >
              <span className="block text-sm font-medium text-ink-50">{o.title ?? o.label}</span>
              {o.sentence ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">{o.sentence}</span> : null}
              {picked.includes(o.value) ? <span className="mt-1 block text-xs text-ink-500">{F.sectorOn}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {!sector ? <p className="text-xs text-ink-500">{F.sectorPick}</p> : null}
    </Shell>
  );
}

/** Delete one sector (M185): a pop-up that names what goes with it, done steps included. */
export function SectorDeleteDialog({ doc, sector, onClose, patch }: { doc: ProjectDoc; sector: Sector; onClose: () => void; patch: (p: Partial<ProjectDoc>) => void }) {
  const name = sectorTitle(sector);
  const r = useMemo(() => sectorRemoval(doc, sector), [doc, sector]);
  const own = (doc.customSubsectors ?? []).filter((c) => c.sector === sector);
  const L = F.deleteLines;
  const lines = [
    ...(r.subsectors.length ? [[L.subsectors, r.subsectors.map(subsectorLabel).join(", ")]] : []),
    ...(r.modules.length ? [[L.modules, r.modules.map((m) => shapeLabel(m) ?? m).join(", ")]] : []),
    ...(r.done ? [[L.done, String(r.done)]] : []),
    ...(r.templates ? [[L.templates, String(r.templates)]] : []),
    ...(own.length ? [[L.own, own.map((c) => c.title).join(", ")]] : []),
    ...(doc.sectorNotes?.[sector] ? [[L.note, doc.sectorNotes[sector]!]] : []),
  ];
  return (
    <Shell
      title={F.deleteTitle(moduleTitle(doc, sector))}
      onClose={onClose}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {F.cancel}
          </Button>
          <span className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="text-rose-400"
            onClick={() => {
              patch(r.patch);
              onClose();
            }}
          >
            {F.deleteConfirm}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-300">{F.deleteBody(name)}</p>
      {lines.length ? (
        <dl className="space-y-2 text-sm">
          {lines.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-500">{k}</dt>
              <dd className="text-ink-100">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-ink-500">{F.deleteNothing}</p>
      )}
      <p className="text-xs leading-relaxed text-ink-500">{F.reassure.split(".")[0]}.</p>
    </Shell>
  );
}
