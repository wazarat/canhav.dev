"use client";

import { useCallback, useMemo, useState } from "react";

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
  subsectorOptionsFor,
} from "@/content/ideation";
import { kitsForDoc } from "@/content/kits";
import {
  GATE_COPY,
  KIT_COPY,
  STARTING_POINT_OPTIONS,
  shapeBlurb,
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
  sectorOfSubsector,
} from "@/lib/sectors";
import { type ProjectChain, chainInfo, projectChainOf } from "@/lib/chains";
import { sectorsChange, shapesChange, subsectorsChange } from "@/lib/classify";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { buildProgress, removedGroupsFor, sectionsFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, FAMILY_LABELS, RAIL_COPY, REVIEW_COPY, STEP_LABELS_KIT } from "@/content/kits/copy";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import {
  KIT_LIMITS,
  type ProductShape,
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
    (sectors.includes("other") && !doc.sectorOther?.trim()) ||
    sectors.some(
      (sec) =>
        SECTOR_SUBSECTORS[sec].length > 0 &&
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
  const subsectorGroups = sectors
    .filter((sec) => subsectorOptionsFor(sec).length > 0)
    .map((sec) => ({
      key: sec,
      heading: SECTOR_OPTIONS.find((o) => o.value === sec)?.title ?? optionLabel(SECTOR_OPTIONS, sec),
      // A subsector whose every shape lacks a protocol on this testnet carries a note, and stays pickable (M52).
      options: subsectorOptionsFor(sec).map((o): ChipOption<Subsector> =>
        shapesFor([o.value]).every((s) => missingFamilies(s, envRows).length > 0)
          ? { ...o, note: GATE_COPY.chipSuffix(chain.short) }
          : o,
      ),
    }));
  const subsectorGated = subsectorGroups.some((g) => g.options.some((o) => o.note));
  const shapeGroups = shapeGroupsFor(subsectors).map((g) => ({
    key: g.subsector,
    heading: g.heading,
    options: g.options.map((o): ChipOption<ProductShape> =>
      missingFamilies(o.value, envRows).length > 0 ? { ...o, note: GATE_COPY.chipSuffix(chain.short) } : o,
    ),
  }));
  const shapeGated = shapeGroups.some((g) => g.options.some((o) => o.note));
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
              <p className="text-xs text-ink-400">{SECTOR_COPY.moreSoon}</p>
            </CardMultiSelectGroups>
            {sectors.includes("other") && (
              <TextField
                label="Which sector?"
                required
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
                {kitShapes(kit).length ? (
                  <div className="-mt-3 space-y-4 text-sm leading-relaxed text-ink-300">
                    {kitShapes(kit).map((s) => (
                      <div key={s}>
                        <p>
                          {kitShapes(kit).length > 1 ? (
                            <span className="font-medium text-ink-100">{shapeLabel(s)}. </span>
                          ) : null}
                          {shapeBlurb(s)}
                        </p>
                        {shapeExamples(s).length ? (
                          <>
                            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                              {KIT_COPY.examplesTitle}
                            </p>
                            <ul className="mt-0.5 list-disc space-y-0.5 pl-5 text-xs leading-relaxed text-ink-400">
                              {shapeExamples(s).map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                      </div>
                    ))}
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
                  <FieldIntroCard intro="project.kit.shape" />
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
          </>
        )}

        {productShape && kit ? (
          <ProductStepSection
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
            {showRail && kit?.shape ? <KitHandoff projectId={id} name={doc.name} /> : null}
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
