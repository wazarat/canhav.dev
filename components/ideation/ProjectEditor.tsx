"use client";

import { useMemo, useState } from "react";

import { EditorShell } from "@/components/ideation/EditorShell";
import { SelectField } from "@/components/ideation/SelectField";
import { StatusDeclarationField } from "@/components/ideation/StatusDeclarationField";
import { TextField } from "@/components/ideation/TextField";
import { useAutosave } from "@/components/ideation/useAutosave";
import { useDraftDoc } from "@/components/ideation/useDraftDoc";
import { usePublish } from "@/components/ideation/usePublish";
import { KitHandoff } from "@/components/ideation/kit/KitHandoff";
import { KitRail } from "@/components/ideation/kit/KitRail";
import { EnvironmentBlock } from "@/components/ideation/kit/EnvironmentBlock";
import { ReviewPasses } from "@/components/ideation/kit/ReviewPasses";
import { FieldIntroCard, OptionResourceCard } from "@/components/ideation/OptionResourceCard";
import { ChipMultiSelect, ChipMultiSelectGroups, ChipRadioGroup } from "@/components/ui/ChipGroup";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { ExternalDepsEditor } from "@/components/ideation/ExternalDepsEditor";
import {
  ORACLE_USE_OPTIONS,
  PAYER_OPTIONS,
  PROJECT_SECURITY_FIELDS,
  ROBINHOOD_MYTH,
  SECTOR_COPY,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  WORST_CASE_PRESSURE,
  optionLabel,
  sectorLabel,
  subsectorLabel,
  subsectorLabels,
  subsectorOptionsFor,
} from "@/content/ideation";
import { kitsForDoc } from "@/content/kits";
import {
  KIT_COPY,
  STARTING_POINT_OPTIONS,
  offeredShapes,
  shapeBlurb,
  shapeGroupsFor,
  shapeLabel,
  shapeLabels,
  startingPointLabel,
} from "@/content/kits/copy";
import { PROJECT_LIMITS, type ProjectDoc, validateProjectDoc } from "@/lib/ideation";
import {
  SECTOR_SUBSECTORS,
  type Sector,
  type Subsector,
  docSectors,
  sectorOfSubsector,
  subsectorsOf,
  withSectors,
} from "@/lib/sectors";
import { KIT_CATALOG } from "@/content/kits/catalog";
import { checklistFor } from "@/content/kits/checklists";
import { CHECKLIST_COPY, RAIL_COPY, REVIEW_COPY } from "@/content/kits/copy";
import { REVIEW_PASSES } from "@/content/kits/review-passes";
import {
  KIT_LIMITS,
  checklistProgress,
  reviewPassesFor,
  reviewProgress,
  KIT_STEPS,
  type ProjectKit,
  effectiveSelection,
  emptyProjectKit,
  kitShapes,
  kitsForSectors,
  overlappingSubsectors,
  packCounts,
  packFor,
  withImpliedSubsectors,
  withShapeSubsectors,
  withShapes,
} from "@/lib/kits";

const STEP_LABELS = ["Basics", "Architecture", "Security", "Reality", "Review"] as const;

function stepProblems(doc: ProjectDoc): Array<string | null> {
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
    short(doc.userIs, L.userIs.min) ||
    !doc.payer ||
    (doc.payer === "third_party" && short(doc.whoPays, L.whoPays.min)) ||
    short(doc.whyThisChain, L.whyThisChain.min) ||
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
    doc.mythAck !== true || short(doc.firstHundredUsers, L.firstHundredUsers.min)
      ? "Reality check incomplete"
      : null;

  return [basics, architecture, security, reality, validateProjectDoc(doc)];
}

export function ProjectEditor({
  id,
  initialDoc,
  initialStatus,
  initialSlug,
  linkPanel,
}: {
  id: string;
  initialDoc: ProjectDoc;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  linkPanel?: React.ReactNode;
}) {
  const { doc, patch, patchSection } = useDraftDoc(initialDoc);
  const [step, setStep] = useState(0);

  const saveState = useAutosave(doc, async (d) => {
    const res = await fetch(`/api/ideation/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ doc: d }),
    });
    if (!res.ok) throw new Error("save failed");
  });
  const { status: publishStatus, publish, unpublish } = usePublish("projects", id);

  const problems = useMemo(() => stepProblems(doc), [doc]);
  const overall = problems[4];
  const kitIds = kitsForDoc(doc);
  const kit = doc.kit;
  const sectors = docSectors(doc);
  const subsectors = doc.subsectors ?? [];
  const patchKit = (partial: Partial<ProjectKit>) =>
    patch({ kit: { ...(kit ?? emptyProjectKit(kitIds)), ...partial } });
  const showRail = kitIds.length > 0;
  /**
   * The kit fields that follow a change of sectors or subsectors. Shapes no
   * longer offered are dropped and `kits` tracks what the sectors open,
   * keeping a kit that already exists when they open nothing.
   */
  const kitAfter = (nextSectors: readonly Sector[], nextSubsectors: readonly Subsector[]) => {
    if (!kit) return {};
    const offered = offeredShapes(nextSubsectors);
    const keep = kitShapes(kit).filter((s) => offered.includes(s));
    const kits = kitsForSectors(nextSectors, nextSubsectors);
    const next = { ...kit, ...withShapes(keep), kits: kits.length ? kits : kit.kits };
    return { kit: { ...next, id: next.kits[0] } };
  };
  const onSectors = (v: Sector[]) => {
    const next = withSectors(v);
    const own = new Set(subsectorsOf(next.sectors));
    const nextSubs = subsectors.filter((s) => own.has(s));
    patch({
      ...next,
      ...(doc.subsectors ? { subsectors: nextSubs } : {}),
      ...kitAfter(next.sectors, nextSubs),
    });
  };
  const onSubsectors = (v: Subsector[]) => {
    const nextSubs = withImpliedSubsectors(v, sectors, v.filter((s) => !subsectors.includes(s)));
    patch({ subsectors: nextSubs, ...kitAfter(sectors, nextSubs) });
  };
  const onShapes = (shapes: readonly string[]) => {
    const list = shapes as ProjectKit["shapes"];
    const nextSubs = withShapeSubsectors(subsectors, list, sectors);
    const kits = kitsForSectors(sectors, nextSubs);
    const base = kit ?? emptyProjectKit(kitIds);
    const nextKits = kits.length ? kits : base.kits;
    patch({
      ...(nextSubs.length !== subsectors.length ? { subsectors: nextSubs } : {}),
      kit: { ...base, ...withShapes(list), kits: nextKits, id: nextKits[0] },
    });
  };
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
      heading: optionLabel(SECTOR_OPTIONS, sec),
      options: subsectorOptionsFor(sec),
    }));
  const kitStep = step === 4 ? null : KIT_STEPS[step];
  const railCounts = useMemo(() => {
    if (!kit?.shape) return null;
    const pack = packFor(KIT_CATALOG, kit, doc);
    return packCounts(pack, effectiveSelection(pack, kit));
  }, [kit, doc]);
  const rail = showRail ? (
    <KitRail doc={doc} kit={kit} step={kitStep} onPatchKit={patchKit} />
  ) : null;

  const steps = STEP_LABELS.map((label, i) => ({ label, problem: problems[i] }));

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
      <div className="max-w-2xl space-y-6">
        {step === 0 && (
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
            <ChipMultiSelect
              label={SECTOR_COPY.label}
              required
              hint={SECTOR_COPY.hint}
              value={sectors}
              onChange={onSectors}
              options={SECTOR_OPTIONS}
              max={PROJECT_LIMITS.sectors.max}
            />
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
              <ChipMultiSelectGroups
                label={SECTOR_COPY.subsectorLabel}
                required
                hint={SECTOR_COPY.subsectorHint}
                value={subsectors}
                onChange={onSubsectors}
                groups={subsectorGroups}
                maxPerGroup={PROJECT_LIMITS.subsectors.max}
              >
                {overlapHints.length > 0 ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink-400">{overlapHints.join(" ")}</p>
                ) : null}
              </ChipMultiSelectGroups>
            )}
            {showRail && (
              <>
                <ChipMultiSelectGroups
                  label={KIT_COPY.shapeLabel}
                  hint={KIT_COPY.shapeHint}
                  value={kitShapes(kit)}
                  onChange={onShapes}
                  max={KIT_LIMITS.shapes.max}
                  groups={shapeGroupsFor(subsectors).map((g) => ({
                    key: g.subsector,
                    heading: g.heading,
                    options: g.options,
                  }))}
                />
                {kitShapes(kit).length ? (
                  <div className="-mt-3 space-y-1.5 text-sm leading-relaxed text-ink-300">
                    {kitShapes(kit).map((s) => (
                      <p key={s}>
                        {kitShapes(kit).length > 1 ? (
                          <span className="font-medium text-ink-100">{shapeLabel(s)}. </span>
                        ) : null}
                        {shapeBlurb(s)}
                      </p>
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
            <TextField
              label="Who the user is"
              required
              value={doc.userIs}
              onChange={(v) => patch({ userIs: v })}
              min={PROJECT_LIMITS.userIs.min}
              max={PROJECT_LIMITS.userIs.max}
              rows={2}
            />
            <SelectField
              label="Who pays"
              required
              hint="Often not the same answer as who the user is."
              value={doc.payer}
              onChange={(v) => patch({ payer: v })}
              options={PAYER_OPTIONS}
            />
            {doc.payer === "third_party" && (
              <TextField
                label="Who pays, exactly?"
                required
                value={doc.whoPays}
                onChange={(v) => patch({ whoPays: v })}
                min={PROJECT_LIMITS.whoPays.min}
                max={PROJECT_LIMITS.whoPays.max}
                rows={2}
                placeholder="The counterparty, protocol, or business that actually pays."
              />
            )}
            <TextField
              label="Why this chain specifically"
              required
              value={doc.whyThisChain}
              onChange={(v) => patch({ whyThisChain: v })}
              min={PROJECT_LIMITS.whyThisChain.min}
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

        {step === 1 && (
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
          </>
        )}

        {step === 2 && (
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

        {step === 3 && (
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
            {showRail ? <EnvironmentBlock kit={kit} /> : null}
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

        {step === 4 && (
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
                    detail={
                      kit && checklistFor(kitShapes(kit)).length
                        ? CHECKLIST_COPY.progress(
                            checklistProgress(checklistFor(kitShapes(kit)), kit).done,
                            checklistFor(kitShapes(kit)).length,
                          )
                        : "Not set"
                    }
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
              <ReviewRow
                term="Who pays"
                detail={
                  doc.payer === "user"
                    ? "The user pays"
                    : doc.payer === "third_party"
                      ? doc.whoPays.trim() || "Someone else pays"
                      : "Not set"
                }
              />
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
      {linkPanel}
      </div>
      {rail ? (
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">{rail}</aside>
      ) : null}
      </div>
    </EditorShell>
  );
}

function ReviewRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink-500">{term}</dt>
      <dd className="text-ink-200">{detail}</dd>
    </div>
  );
}
