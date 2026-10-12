"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";

import { AgentChangesPanel } from "@/components/ideation/AgentChangesPanel";
import { StaleDraftNotice } from "@/components/ideation/StaleDraftNotice";
import { useDraftSave } from "@/components/ideation/useDraftSave";

import { EditorShell } from "@/components/ideation/EditorShell";
import { SelectField } from "@/components/ideation/SelectField";
import { StatusDeclarationField } from "@/components/ideation/StatusDeclarationField";
import { TextField } from "@/components/ideation/TextField";
import { useAutosave } from "@/components/ideation/useAutosave";
import { useDraftDoc } from "@/components/ideation/useDraftDoc";
import { usePublish } from "@/components/ideation/usePublish";
import { KitHandoff } from "@/components/ideation/kit/KitHandoff";
import { KitRail } from "@/components/ideation/kit/KitRail";
import { ProductStepSection } from "@/components/ideation/kit/ProductStepSection";
import { EnvironmentBlock } from "@/components/ideation/kit/EnvironmentBlock";
import { IdeasList } from "@/components/ideation/kit/IdeasList";
import { ShapeOverlapDialog } from "@/components/ideation/kit/ShapeOverlapDialog";
import { TEMPLATE_CATALOG } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
import { templateChainCounts, templatesForShapes } from "@/lib/templates";
import { ReviewPasses } from "@/components/ideation/kit/ReviewPasses";
import { FieldIntroCard, OptionResourceCard } from "@/components/ideation/OptionResourceCard";
import {
  CardMultiSelectGroups,
  ChipMultiSelectGroups,
  type ChipOption,
  ChipRadioGroup,
} from "@/components/ui/ChipGroup";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { ExternalDepsEditor } from "@/components/ideation/ExternalDepsEditor";
import { ReferencesEditor } from "@/components/ideation/ReferencesEditor";
import { MainnetEditor } from "@/components/ideation/MainnetEditor";
import { PersonaTableEditor } from "@/components/ideation/PersonaTableEditor";
import {
  AUDIENCE_OPTIONS,
  CHAIN_COPY,
  ORACLE_USE_OPTIONS,
  PAYER_OPTIONS,
  PERSONA_COPY,
  PROJECT_SECURITY_FIELDS,
  ROBINHOOD_MYTH,
  SECTOR_COPY,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  WORST_CASE_PRESSURE,
  audiencePersonaCards,
  optionLabel,
  personaRows,
  sectorLabel,
  subsectorLabel,
  subsectorLabels,
  subsectorOptionsFor, closedSectorLabels, ALL_SUBSECTOR_OPTIONS } from "@/content/ideation";
import { kitsForDoc } from "@/content/kits";
import {
  GATE_COPY,
  KIT_COPY,
  STARTING_POINT_OPTIONS,
  shapeBlurb,
  shapeBuildingPhrase,
  shapeExamples,
  shapeGroupsFor,
  shapeLabel,
  shapeLabels,
  startingPointLabel,
} from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import {
  PROJECT_LIMITS,
  type ProjectDoc,
  docAudience,
  emptyConsumerPersona,
  emptyPersona,
  validateProjectDoc,
} from "@/lib/ideation";
import {
  SECTOR_SUBSECTORS,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector, requiresSubsector } from "@/lib/sectors";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { type LaunchTarget, launchTargetFit } from "@/lib/launch-targets";
import { launchTargetHandoffLine } from "@/content/launch-targets";
import { sectorsChange, shapesChange, subsectorsChange } from "@/lib/classify";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { buildProgress, removedGroupsFor, sectionsFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, FAMILY_LABELS, RAIL_COPY, REVIEW_COPY, STEP_LABELS_KIT } from "@/content/kits/copy";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import {
  KIT_LIMITS,
  type ProductShape,
  familiesOnMainnet,
  missingFamilies,
  shapesFor,
  reviewPassesFor,
  reviewProgress,
  type KitStep,
  type ProjectKit,
  groupProgress,
  effectiveSelection,
  emptyProjectKit,
  kitShapes,
  overlappingSubsectors,
  packCounts,
  packFor,
  SHAPE_FAMILIES,
  impliedShapesFor,
} from "@/lib/kits";

/**
 * The editor's steps (M43). Four document steps, one product section per
 * chosen shape, then Review last. Product sections hold the build steps for
 * that shape and never gate publishing.
 */
type EditorStep = { kind: "doc"; key: KitStep } | { kind: "product"; shape: ProductShape };

const DOC_STEPS: readonly KitStep[] = ["basics", "architecture", "security", "reality"];

function stepProblems(doc: ProjectDoc): Record<KitStep, string | null> {
  const L = PROJECT_LIMITS;
  const short = (v: string, min: number) => v.trim().length < min;

  const sectors = docSectors(doc);
  const subsectors = doc.subsectors ?? [];
  const basics =
    short(doc.name, L.name.min) ||
    sectors.length < L.sectors.min ||
    (sectors.includes("other") &&
      !doc.sectorOther?.trim() &&
      !subsectors.some((v) => SECTOR_SUBSECTORS.other.includes(v))) ||
    sectors.some(
      (sec) =>
        requiresSubsector(sec) &&
        subsectors.filter((v) => SECTOR_SUBSECTORS[sec].includes(v)).length < L.subsectors.min,
    ) ||
    short(doc.whatItDoes, L.whatItDoes.min) ||
    !doc.stage
      ? "Basics incomplete"
      : null;

  const a = doc.architecture;
  const architecture =
    short(a.contracts, L.architectureField.min) ||
    (!a.externalDepsNone &&
      (a.externalDeps.length === 0 ||
        a.externalDeps.some((d) => short(d.name, L.externalDepName.min)))) ||
    !a.oracleUse ||
    (a.oracleUse === "uses" && short(a.oracles, L.architectureField.min)) ||
    short(a.adminFunctions, L.architectureField.min) ||
    !a.upgradeability
      ? "Architecture incomplete"
      : null;

  const decls = Object.values(doc.security);
  const security =
    !doc.worstCase || decls.some((d) => !["in_place", "legal_ops", "planned_before_mainnet", "not_yet"].includes(d.status))
      ? "Security incomplete"
      : null;

  const reality =
    (projectChainOf(doc) === "robinhood_testnet" && doc.mythAck !== true) || short(doc.firstHundredUsers, L.firstHundredUsers.min)
      ? "Reality check incomplete"
      : null;

  return { basics, architecture, security, reality, review: validateProjectDoc(doc) };
}

export function ProjectEditor({
  id,
  initialDoc,
  initialStatus,
  initialSlug,
  initialRev,
  chainLocked = false,
  linkedLaunchTarget = null,
  linkPanel,
  headerActions,
}: {
  id: string;
  initialDoc: ProjectDoc;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  /** The draft's agent revision at load. Undefined before the database update (M39). */
  initialRev?: number;
  /** True once a token has launched from the project, which fixes its chain (M52). */
  chainLocked?: boolean;
  /** The launch venue the linked token design ideates for (M69), null when none. */
  linkedLaunchTarget?: LaunchTarget | null;
  linkPanel?: React.ReactNode;
  /** Buttons across from the project name (the agent prompt and the token link, M56). */
  headerActions?: React.ReactNode;
}) {
  const { doc, patch, patchSection, setDoc } = useDraftDoc(initialDoc);
  const [step, setStep] = useState(0);

  const { save, stale, adopt, rev } = useDraftSave("projects", id, initialRev);
  const saveState = useAutosave(doc, save);
  const [heldRev, setHeldRev] = useState(initialRev);

  /**
   * An agent wrote to this draft while the editor was open. With nothing
   * unsaved here the editor takes the latest draft and carries on. With
   * unsaved typing it leaves the page alone; the next save is refused and
   * the stale notice explains.
   */
  const pullLatest = useCallback(async () => {
    if (saveState === "saving" || saveState === "error") return;
    try {
      const res = await fetch(`/api/ideation/projects/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      const { row } = (await res.json()) as {
        row: { draft_doc: ProjectDoc; agent_rev?: number };
      };
      if (typeof row.agent_rev !== "number" || row.agent_rev === rev.current) return;
      adopt(row.agent_rev);
      setHeldRev(row.agent_rev);
      setDoc(row.draft_doc);
    } catch {
      // The next poll tries again.
    }
  }, [id, saveState, adopt, rev, setDoc]);
  const { status: publishStatus, publish, unpublish } = usePublish("projects", id);

  const problems = useMemo(() => stepProblems(doc), [doc]);
  const overall = problems.review;
  const kitIds = kitsForDoc(doc);
  const kit = doc.kit;
  const sectors = docSectors(doc);
  const subsectors = doc.subsectors ?? [];
  const chainKey = projectChainOf(doc);
  const chain = chainInfo(chainKey);
  const envRows = KIT_ENVIRONMENTS[chainKey];
  const patchKit = (partial: Partial<ProjectKit>) =>
    patch({ kit: { ...(kit ?? emptyProjectKit(kitIds)), ...partial } });
  const showRail = kitIds.length > 0;
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
      // A subsector whose every shape lacks a protocol on this testnet carries a note, and stays pickable (M52).
      options: subsectorOptionsFor(sec).map((o): ChipOption<Subsector> => {
        const shapes = shapesFor([o.value]);
        return shapes.every((s) => missingFamilies(s, envRows).length > 0)
          ? { ...o, note: gateNote([...new Set(shapes.flatMap((s) => missingFamilies(s, envRows)))]) }
          : o;
      }),
    }));
  const subsectorGated = subsectorGroups.some((g) => g.options.some((o) => o.note));
  // A subsector that offers exactly one shape names it on its own (no second pick). Its
  // shape is kept on the kit by subsectorsChange; older drafts catch up here.
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
  const shapeGroups = shapeGroupsFor(subsectors).filter((g) => !singleSubs.includes(g.subsector)).map((g) => ({
    key: g.subsector,
    heading: g.heading,
    options: g.options.map((o): ChipOption<ProductShape> => {
      const missing = missingFamilies(o.value, envRows);
      if (missing.length > 0) return { ...o, note: gateNote(missing) };
      // A template-driven shape (M65 onward) relies on no family, so its note counts the templates live on the mainnet.
      if (SHAPE_FAMILIES[o.value].length === 0) {
        const { live, total } = templateChainCounts(templatesForShapes(TEMPLATE_CATALOG, [o.value], chainKey), chainKey);
        return total ? { ...o, note: TEMPLATE_COPY.chipNote(live, total, chain.mainnetName) } : o;
      }
      return o;
    }),
  }));
  const shapeGated = shapeGroups.some((g) => g.options.some((o) => missingFamilies(o.value, envRows).length > 0));
  const audience = docAudience(doc);
  const shapesKey = kitShapes(kit).join(",");
  const editorSteps = useMemo<EditorStep[]>(
    () => [
      ...DOC_STEPS.map((key): EditorStep => ({ kind: "doc", key })),
      ...(shapesKey ? shapesKey.split(",") : []).map((shape): EditorStep => ({ kind: "product", shape: shape as ProductShape })),
      { kind: "doc", key: "review" },
    ],
    [shapesKey],
  );
  // Kit aware, so removed steps are gone and added ones are in (M50).
  const sections = useMemo(() => sectionsFor(kitShapes(kit), kit ?? {}), [kit]);
  // Companion contract choices (M70): the accepted templates with a Pons fit on this project's shapes.
  const companionOptions = useMemo(
    () =>
      templatesForShapes(TEMPLATE_CATALOG, kitShapes(kit), chainKey)
        .filter((t) => t.ponsFit && kit?.templates?.[t.id] === "accepted")
        .map((t) => ({ value: t.id, label: t.name })),
    [kit, chainKey],
  );
  const removedByShape = useMemo(() => removedGroupsFor(kit), [kit]);
  const current = editorSteps[Math.min(step, editorSteps.length - 1)];
  const docStep = current.kind === "doc" ? current.key : null;
  const productShape = current.kind === "product" ? current.shape : null;
  const kitStep = docStep && docStep !== "review" ? docStep : null;
  const build = buildProgress(kit);
  const railCounts = useMemo(() => {
    if (!kit?.shape) return null;
    const pack = packFor(KIT_CATALOG, kit, doc);
    return packCounts(pack, effectiveSelection(pack, kit));
  }, [kit, doc]);
  const rail = showRail ? (
    <KitRail doc={doc} kit={kit} step={kitStep} onPatchKit={patchKit} />
  ) : null;

  const steps = editorSteps.map((s) =>
    s.kind === "doc"
      ? { key: s.key, label: STEP_LABELS_KIT[s.key], problem: problems[s.key] }
      : {
          key: s.shape,
          label: shapeLabel(s.shape) ?? s.shape,
          variant: "product" as const,
          kicker: CHECKLIST_COPY.productKicker,
          problem: (() => {
            const section = sections.find((x) => x.shape === s.shape);
            const p = section ? groupProgressOf(section, kit) : { done: 0, total: 0 };
            return p.done === p.total ? null : CHECKLIST_COPY.openProblem;
          })(),
        },
  );

  return (
    <EditorShell
      kicker="Project"
      name={doc.name}
      publicBase="/p"
      initialStatus={initialStatus}
      initialSlug={initialSlug}
      saveState={saveState}
      publishStatus={publishStatus}
      canPublish={overall === null}
      publishProblem={overall}
      onPublish={publish}
      onUnpublish={unpublish}
      steps={steps}
      current={step}
      onSelectStep={(i) => setStep(Math.max(0, Math.min(steps.length - 1, i)))}
      headerActions={headerActions}
    >
      <div className={showRail ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]" : undefined}>
      <div>
      {rail ? (
        <details className="glass mb-6 rounded-2xl lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink-100">
            {RAIL_COPY.title}
            {railCounts ? (
              <span className="ml-2 text-xs text-ink-400">
                {RAIL_COPY.selectedOf(railCounts.selected, railCounts.total)}
              </span>
            ) : null}
          </summary>
          <div className="px-2 pb-2">{rail}</div>
        </details>
      ) : null}
      {stale ? <StaleDraftNotice /> : null}
      <div className="max-w-2xl space-y-6">
        {docStep === "basics" && (
          <>
            <TextField
              label="Project name"
              required
              value={doc.name}
              onChange={(v) => patch({ name: v })}
              min={PROJECT_LIMITS.name.min}
              max={PROJECT_LIMITS.name.max}
              placeholder="What is this called?"
            />
            <ChipRadioGroup
              label={CHAIN_COPY.label}
              hint={chainLocked ? CHAIN_COPY.locked : CHAIN_COPY.hint}
              value={chainKey}
              onChange={(v) => {
                // A radio can be unticked to "", and the chain always has a value.
                if (v && !chainLocked) patch({ chain: v as ProjectChain });
              }}
              options={CHAIN_COPY.options.map((o) =>
                chainLocked && o.value !== chainKey ? { ...o, disabled: true } : o,
              )}
            />
            <CardMultiSelectGroups
              label={SECTOR_COPY.label}
              required
              hint={SECTOR_COPY.hint}
              value={sectors}
              onChange={onSectors}
              groups={[{ key: "sectors", heading: SECTOR_COPY.label, options: SECTOR_OPTIONS }]}
              max={PROJECT_LIMITS.sectors.max}
            >
              {closedSectorLabels().length ? (
                <p className="text-xs text-ink-400">{SECTOR_COPY.moreSoon(closedSectorLabels())}</p>
              ) : null}
            </CardMultiSelectGroups>
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
              <CardMultiSelectGroups
                label={SECTOR_COPY.subsectorLabel}
                required
                hint={SECTOR_COPY.subsectorHint}
                value={subsectors}
                onChange={onSubsectors}
                groups={subsectorGroups}
                maxPerGroup={PROJECT_LIMITS.subsectors.max}
              >
                {overlapHints.length > 0 ? (
                  <p className="text-xs leading-relaxed text-ink-400">{overlapHints.join(" ")}</p>
                ) : null}
                {subsectorGated ? (
                  <p className="text-xs leading-relaxed text-ink-500">{GATE_COPY.note(chain.short)}</p>
                ) : null}
              </CardMultiSelectGroups>
            )}
            {showRail && (
              <>
                {buildingLines.length ? (
                  <div className="space-y-2">
                    {shapeGroups.length === 0 ? (
                      <span className="text-xs font-medium text-ink-200">{KIT_COPY.shapeLabel}</span>
                    ) : null}
                    <ul className="space-y-2">
                      {buildingLines.map((b) => (
                        <li key={b.shape} className="rounded-xl border border-ink-700/60 bg-ink-950/50 px-3 py-2">
                          <p className="text-xs leading-relaxed text-ink-100">{b.line}</p>
                          {b.gateNote ? <p className="mt-1 text-xs text-ink-400">{b.gateNote}</p> : null}
                          {b.noTemplate ? (
                            <span className="group relative mt-2 inline-flex">
                              <StatusChip tone="info">
                                {TEMPLATE_COPY.noneOnChainNote(chain.mainnetName)}
                                <button
                                  type="button"
                                  aria-label={TEMPLATE_COPY.noneOnChainAria}
                                  className="ml-1.5 inline-flex rounded-full text-ink-400 transition-colors hover:text-ink-100 focus:outline-none"
                                >
                                  <Info aria-hidden className="h-3.5 w-3.5" />
                                </button>
                              </StatusChip>
                              <span
                                role="tooltip"
                                className="glass pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-80 space-y-2 rounded-xl border border-ink-700/60 p-3 text-xs leading-relaxed text-ink-200 group-hover:block group-focus-within:block"
                              >
                                <span className="block">{TEMPLATE_COPY.noneOnChainDetail(chain.mainnetName)}</span>
                                <span className="block text-ink-100">{b.plan}</span>
                              </span>
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-ink-500">{KIT_COPY.buildingHint}</p>
                  </div>
                ) : null}
                {shapeGroups.length > 0 ? (
                  <ChipMultiSelectGroups
                    label={KIT_COPY.shapeLabel}
                    hint={KIT_COPY.shapeHint}
                    value={kitShapes(kit)}
                    onChange={onShapes}
                    max={KIT_LIMITS.shapes.max}
                    groups={shapeGroups}
                  >
                    {shapeGated ? (
                      <p className="mt-2 text-xs leading-relaxed text-ink-500">{GATE_COPY.note(chain.short)}</p>
                    ) : null}
                  </ChipMultiSelectGroups>
                ) : null}
                {kitShapes(kit).length && kit ? (
                  <div className="-mt-2 space-y-3 text-xs leading-relaxed text-ink-300">
                    {kitShapes(kit).map((s) => (
                      <div key={s}>
                        <p>
                          <span className="font-medium text-ink-100">{shapeLabel(s)}. </span>
                          {shapeBlurb(s)}
                        </p>
                        <IdeasList shape={s} examples={shapeExamples(s)} kit={kit} onPatchKit={patchKit} />
                      </div>
                    ))}
                    <p className="text-[11px] text-ink-500">{KIT_COPY.ideasHint}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {kitShapes(kit).map((s) => (
                    <OptionResourceCard
                      key={s}
                      field="project.kit.shape"
                      value={s}
                      label={kitShapes(kit).length > 1 ? `Why ${shapeLabel(s)}` : undefined}
                    />
                  ))}
                  <ShapeOverlapDialog doc={doc} />
                </div>
                <ChipRadioGroup
                  label={KIT_COPY.startingPointLabel}
                  value={kit?.startingPoint ?? ""}
                  onChange={(startingPoint) => patchKit({ startingPoint })}
                  options={STARTING_POINT_OPTIONS}
                />
                {kit?.startingPoint === "existing_product" && (
                  <TextField
                    label={KIT_COPY.existingProductLabel}
                    hint={KIT_COPY.existingProductHint}
                    value={kit.existingProduct ?? ""}
                    onChange={(v) => patchKit({ existingProduct: v })}
                    max={KIT_LIMITS.existingProduct.max}
                    placeholder={KIT_COPY.existingProductPlaceholder}
                  />
                )}
              </>
            )}
            <TextField
              label="What it does"
              required
              value={doc.whatItDoes}
              onChange={(v) => patch({ whatItDoes: v })}
              min={PROJECT_LIMITS.whatItDoes.min}
              max={PROJECT_LIMITS.whatItDoes.max}
              rows={5}
              placeholder="One paragraph. What does it actually do?"
            />
            <ChipRadioGroup
              label={PERSONA_COPY.audienceLabel}
              hint={audience ? PERSONA_COPY.audienceHints[audience] : PERSONA_COPY.audienceHint}
              value={audience}
              onChange={(v) => patch({ audience: v })}
              options={AUDIENCE_OPTIONS}
            />
            {audience === "b2b" ? (
              <PersonaTableEditor
                rows={personaRows("b2b")}
                personas={doc.personas}
                onChange={(personas) => patch({ personas })}
                empty={emptyPersona}
                note={PERSONA_COPY.note}
              />
            ) : audience === "b2c" ? (
              <PersonaTableEditor
                rows={personaRows("b2c")}
                personas={doc.consumerPersonas}
                onChange={(consumerPersonas) => patch({ consumerPersonas })}
                empty={emptyConsumerPersona}
                note={PERSONA_COPY.note}
              />
            ) : null}
            {(initialDoc.userIs.trim() || doc.userIs.trim()) && (
              <TextField
                label={PERSONA_COPY.legacyLabel}
                value={doc.userIs}
                onChange={(v) => patch({ userIs: v })}
                max={PROJECT_LIMITS.userIs.max}
                rows={2}
              />
            )}
            <SelectField
              label="Who pays"
              hint="Often not the same answer as who the user is."
              value={doc.payer}
              onChange={(v) => patch({ payer: v })}
              options={PAYER_OPTIONS}
              clearable
            />
            {doc.payer === "third_party" && (
              <TextField
                label="Who pays, exactly?"
                value={doc.whoPays}
                onChange={(v) => patch({ whoPays: v })}
                max={PROJECT_LIMITS.whoPays.max}
                rows={2}
                placeholder="The counterparty, protocol, or business that actually pays."
              />
            )}
            <TextField
              label="Why this chain specifically"
              value={doc.whyThisChain}
              onChange={(v) => patch({ whyThisChain: v })}
              max={PROJECT_LIMITS.whyThisChain.max}
              rows={3}
            />
            <SelectField
              label="Current stage"
              required
              value={doc.stage}
              onChange={(v) => patch({ stage: v })}
              options={STAGE_OPTIONS}
            />
          </>
        )}

        {docStep === "architecture" && (
          <>
            <TextField
              label="What contracts exist"
              required
              hint='"None yet" is an honest answer.'
              value={doc.architecture.contracts}
              onChange={(v) => patchSection("architecture", { contracts: v })}
              min={PROJECT_LIMITS.architectureField.min}
              max={PROJECT_LIMITS.architectureField.max}
              rows={3}
            />
            <ExternalDepsEditor
              deps={doc.architecture.externalDeps}
              none={doc.architecture.externalDepsNone}
              onChange={(deps, none) =>
                patchSection("architecture", { externalDeps: deps, externalDepsNone: none })
              }
            />
            <SelectField
              label="Oracles"
              required
              hint="Anything that feeds prices or data into your contracts."
              value={doc.architecture.oracleUse}
              onChange={(v) => patchSection("architecture", { oracleUse: v })}
              options={ORACLE_USE_OPTIONS}
            />
            {doc.architecture.oracleUse === "uses" && (
              <TextField
                label="Which oracles, and for what?"
                required
                value={doc.architecture.oracles}
                onChange={(v) => patchSection("architecture", { oracles: v })}
                min={PROJECT_LIMITS.architectureField.min}
                max={PROJECT_LIMITS.architectureField.max}
                rows={2}
              />
            )}
            <TextField
              label="Admin functions, and why they exist"
              required
              hint='"None" is a valid and strong answer for immutable contracts. Say so explicitly.'
              value={doc.architecture.adminFunctions}
              onChange={(v) => patchSection("architecture", { adminFunctions: v })}
              min={PROJECT_LIMITS.architectureField.min}
              max={PROJECT_LIMITS.architectureField.max}
              rows={3}
            />
            <SelectField
              label="Upgradeability"
              required
              value={doc.architecture.upgradeability}
              onChange={(v) => patchSection("architecture", { upgradeability: v })}
              options={UPGRADEABILITY_OPTIONS}
            />
            <ReferencesEditor
              references={doc.references ?? []}
              onChange={(references) => patch({ references })}
            />
          </>
        )}

        {docStep === "security" && (
          <>
            <SelectField
              label="What's the worst thing a bug could do?"
              required
              value={doc.worstCase}
              onChange={(v) => patch({ worstCase: v })}
              options={WORST_CASE_OPTIONS}
            />
            {doc.worstCase && (
              <StatusChip
                tone={doc.worstCase === "nothing_serious" ? "info" : "warning"}
                variant="block"
              >
                {WORST_CASE_PRESSURE[doc.worstCase]}
              </StatusChip>
            )}
            <div className="space-y-5">
              {PROJECT_SECURITY_FIELDS.map(({ key, label }) => (
                <StatusDeclarationField
                  key={key}
                  label={label}
                  value={doc.security[key]}
                  onChange={(v) => patchSection("security", { [key]: v })}
                />
              ))}
            </div>
            {showRail && kit?.shape ? <ReviewPasses kit={kit} onPatchKit={patchKit} /> : null}
          </>
        )}

        {docStep === "reality" && (
          <>
            {chainKey === "robinhood_testnet" ? (
              <>
                <StatusChip tone="warning" variant="block">
                  <span className="block font-medium text-ink-100">{ROBINHOOD_MYTH.title}</span>
                  <span className="mt-1 block">{ROBINHOOD_MYTH.body}</span>
                </StatusChip>
                <label className="flex items-start gap-2.5 text-sm text-ink-200">
                  <input
                    type="checkbox"
                    checked={doc.mythAck}
                    onChange={(e) => patch({ mythAck: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-ink-700 bg-ink-950 accent-electric-500"
                  />
                  {ROBINHOOD_MYTH.ack}
                </label>
              </>
            ) : null}
            {showRail ? <EnvironmentBlock kit={kit} chain={chainKey} /> : null}
            <TextField
              label={ROBINHOOD_MYTH.followUp}
              required
              value={doc.firstHundredUsers}
              onChange={(v) => patch({ firstHundredUsers: v })}
              min={PROJECT_LIMITS.firstHundredUsers.min}
              max={PROJECT_LIMITS.firstHundredUsers.max}
              rows={3}
              placeholder="Names of communities, channels, waitlists. The concrete plan."
            />
            <Field
              label="GitHub repo"
              hint="owner/name. Linking it adds commit history to your public page."
            >
              <Input
                value={doc.githubRepo ?? ""}
                onChange={(e) => patch({ githubRepo: e.target.value.trim() || undefined })}
                placeholder="your-org/your-repo"
              />
            </Field>
            <Field
              label="Testnet contract addresses"
              hint="One 0x address per line. We read deploy history from the chain. The addresses are the claim, the chain is the evidence."
            >
              <textarea
                value={(doc.testnetContracts ?? []).join("\n")}
                onChange={(e) => {
                  const list = e.target.value
                    .split("\n")
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean);
                  patch({ testnetContracts: list.length ? list : undefined });
                }}
                rows={3}
                className="w-full rounded-xl border border-ink-700/60 bg-ink-950/70 px-3.5 py-2.5 font-mono text-xs text-ink-50 placeholder:text-ink-500 focus:border-electric-500/60 focus:outline-none focus:ring-1 focus:ring-electric-500/30"
                placeholder={"0x…\n0x…"}
              />
            </Field>
            <Field
              label="Team wallet"
              hint='Shown as "declared by team". Deploy history for this wallet renders on your public page.'
            >
              <Input
                value={doc.verifyWallet ?? ""}
                onChange={(e) =>
                  patch({ verifyWallet: e.target.value.trim().toLowerCase() || undefined })
                }
                placeholder="0x…"
                className="font-mono text-xs"
              />
            </Field>
            <MainnetEditor
              mainnet={doc.mainnet}
              chain={chainKey}
              companionOptions={companionOptions}
              onChange={(next) => {
                const { mainnet: _old, ...rest } = doc;
                setDoc(next ? { ...rest, mainnet: next } : (rest as typeof doc));
              }}
            />
          </>
        )}

        {productShape && kit ? (
          <ProductStepSection
            chain={chainKey}
            key={productShape}
            missing={missingFamilies(productShape, envRows).map((f) => FAMILY_LABELS[f])}
            chainName={chain.short}
            section={sections.find((x) => x.shape === productShape) ?? { shape: productShape, groups: [], sharedAbove: [] }}
            removed={removedByShape.get(productShape)}
            kit={kit}
            onPatchKit={patchKit}
          />
        ) : null}

        {docStep === "review" && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-ink-400">
              Publishing makes this page public and snapshots it. Every
              version is kept, and the latest renders at your public URL.
            </p>
            <dl className="space-y-3 text-sm">
              <ReviewRow term="Sector" detail={sectorLabel(doc)} />
              {subsectorGroups.length > 0 && (
                <ReviewRow
                  term="Subsector"
                  detail={subsectorLabels(doc).join(" · ") || "Not set"}
                />
              )}
              {showRail && (
                <>
                  <ReviewRow term="Building" detail={shapeLabels(kit).join(" · ") || "Not set"} />
                  <ReviewRow
                    term="Starting from"
                    detail={(kit && startingPointLabel(kit)) ?? "Not set"}
                  />
                  <ReviewRow
                    term="Build steps"
                    detail={build.total ? CHECKLIST_COPY.progress(build.done, build.total) : "Not set"}
                  />
                  <ReviewRow
                    term="Review passes"
                    detail={
                      kit && reviewPassesFor(REVIEW_PASSES, kitShapes(kit)).length
                        ? REVIEW_COPY.reviewRow(reviewProgress(reviewPassesFor(REVIEW_PASSES, kitShapes(kit)), kit))
                        : "Not set"
                    }
                  />
                  <ReviewRow
                    term="Resource pack"
                    detail={
                      railCounts
                        ? `${railCounts.selected} selected of ${railCounts.total}. ${railCounts.core} core, ${railCounts.recommended} recommended, ${railCounts.deepDive} deep dive.`
                        : "Not set"
                    }
                  />
                </>
              )}
              <ReviewRow term="Stage" detail={optionLabel(STAGE_OPTIONS, doc.stage)} />
              {audience ? (
                <ReviewRow term={PERSONA_COPY.audienceLabel} detail={optionLabel(AUDIENCE_OPTIONS, audience)} />
              ) : null}
              {audiencePersonaCards(doc).map((cells, i) => (
                <ReviewRow
                  key={i}
                  term={PERSONA_COPY.column(i + 1)}
                  detail={cells.map((c) => `${c.label} ${c.value}`).join(" · ")}
                />
              ))}
              {doc.payer ? (
                <ReviewRow
                  term="Who pays"
                  detail={
                    doc.payer === "user"
                      ? "The user pays"
                      : doc.whoPays.trim() || "Someone else pays"
                  }
                />
              ) : null}
              <ReviewRow
                term="Dependencies"
                detail={
                  doc.architecture.externalDepsNone
                    ? "None"
                    : doc.architecture.externalDeps.length
                      ? doc.architecture.externalDeps.map((d) => d.name).join(" · ")
                      : "Not set"
                }
              />
              <ReviewRow
                term="Oracles"
                detail={
                  doc.architecture.oracleUse === "none"
                    ? "None"
                    : doc.architecture.oracleUse === "uses"
                      ? doc.architecture.oracles.trim() || "Uses oracles"
                      : "Not set"
                }
              />
              <ReviewRow
                term="Worst case"
                detail={optionLabel(WORST_CASE_OPTIONS, doc.worstCase)}
              />
              <ReviewRow
                term="Security"
                detail={PROJECT_SECURITY_FIELDS.map(
                  ({ key, label }) => {
                    const v = doc.security[key].status
                      ? STATUS_DECL_LABELS[doc.security[key].status]
                      : "Not set";
                    return `${label} ${v.charAt(0).toLowerCase()}${v.slice(1)}`;
                  },
                ).join(" · ")}
              />
            </dl>
            {overall ? (
              <StatusChip tone="warning" variant="block">
                Not ready to publish yet. {overall}
              </StatusChip>
            ) : (
              <StatusChip tone="success" variant="block">
                Everything checks out. Publish from the button above.
              </StatusChip>
            )}
            {showRail && kit?.shape ? (
              <KitHandoff
                projectId={id}
                name={doc.name}
                venueLine={
                  linkedLaunchTarget
                    ? launchTargetHandoffLine(linkedLaunchTarget, launchTargetFit(linkedLaunchTarget, chainKey))
                    : null
                }
              />
            ) : null}
          </div>
        )}
      </div>
      <AgentChangesPanel
        projectId={id}
        doc={doc}
        rev={heldRev}
        paused={stale}
        onApply={setDoc}
        onRemoteChange={pullLatest}
      />
      {linkPanel}
      </div>
      {rail ? (
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">{rail}</aside>
      ) : null}
      </div>
    </EditorShell>
  );
}

function groupProgressOf(section: { groups: import("@/lib/kits").StepGroup[] }, kit: ProjectKit | undefined) {
  return groupProgress(section.groups, kit);
}

function ReviewRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink-500">{term}</dt>
      <dd className="text-ink-200">{detail}</dd>
    </div>
  );
}
