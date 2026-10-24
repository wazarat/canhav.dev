"use client";

import { useMemo, useState } from "react";

import { AllocationSplitEditor } from "@/components/ideation/AllocationSplitEditor";
import { ComputedPanel } from "@/components/ideation/ComputedPanel";
import { EditorShell } from "@/components/ideation/EditorShell";
import { LogoField } from "@/components/ideation/LogoField";
import { NameTickerCheck } from "@/components/ideation/NameTickerCheck";
import { FieldIntroCard, OptionResourceCard } from "@/components/ideation/OptionResourceCard";
import { SelectField } from "@/components/ui/Select";
import { StatusDeclarationField } from "@/components/ideation/StatusDeclarationField";
import { TextField } from "@/components/ideation/TextField";
import { StaleDraftNotice } from "@/components/ideation/StaleDraftNotice";
import { useAutosave } from "@/components/ideation/useAutosave";
import { useDraftSave } from "@/components/ideation/useDraftSave";
import { ShapeAdviceCard } from "@/components/ideation/ShapeAdviceCard";
import { MilestoneListFields } from "@/components/launch/MilestoneListFields";
import { TokenStepSection } from "@/components/ideation/TokenStepSection";
import { useDraftDoc } from "@/components/ideation/useDraftDoc";
import { usePublish } from "@/components/ideation/usePublish";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { Collapsible } from "@/components/ui/Collapsible";
import { InfoTip } from "@/components/ui/InfoTip";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  DEPLOYABILITY_COPY,
  DEPLOYABILITY_TIER_LABELS,
  type ResourceIntroKey,
} from "@/content/ideation-resources";
import { POST_LAUNCH_MILESTONE_COPY, PUBLISH_COPY, LOGO_COPY, TOKEN_EDITOR_COPY } from "@/content/ideation";
import { CHECKLIST_COPY } from "@/content/kits/copy";
import { TOKEN_STEPS_COPY, tokenBuildProgressOf } from "@/content/token-steps";
import type { IndexedCurve } from "@/lib/indexer";
import type { ProductShape } from "@/lib/kits";
import type { TokenLaunchFacts } from "@/lib/token-steps";
import { TOKEN_DESIGN_STEP_LABELS, tokenDesignStepProblems } from "@/lib/token-design-steps";
import { LAUNCH_FORM, launchChain } from "@/content/launch";
import {
  ALLOCATION_ENFORCEMENT_NOTE,
  ANTI_SNIPING_OPTIONS,
  COUNSEL_OPTIONS,
  DISTRIBUTION_EVENT_OPTIONS,
  FOUNDER_LEAVES_OPTIONS,
  GOVERNANCE_FACTS,
  GOVERNANCE_FIELDS,
  GOVERNANCE_FRAMING,
  ISSUANCE_PATH_OPTIONS,
  LEGAL_DISCLAIMER,
  LEGAL_TOPICS,
  LP_TREATMENT_OPTIONS,
  MARKET_TIMING_OPTIONS,
  RATIONALE_WHY_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  REPORTING_OPTIONS,
  SUPPLY_POLICY_OPTIONS,
  UNDERSUBSCRIPTION_OPTIONS,
} from "@/content/ideation";
import { LAUNCH_TARGET_COPY, LAUNCH_TARGET_INFO, LAUNCH_TARGET_OPTIONS, launchTargetLabel } from "@/content/launch-targets";
import type { ProjectChain } from "@/lib/chains";
import { explorerAddressUrl } from "@/lib/explorer";
import { launchTargetChainBound } from "@/lib/launch-targets";
import {
  type CohortVesting,
  TOKEN_DESIGN_LIMITS,
  type TokenDesignDoc,
  type VestedCohort,
  isSaleEvent,
  vestedCohorts,
} from "@/lib/ideation";
import { type DeployabilityTier, deployabilityFindings } from "@/lib/tokenDesign";

const GOVERNANCE_INTROS: Record<string, ResourceIntroKey> = {
  mechanism: "token.governance.mechanism",
  adminKeys: "token.governance.adminKeys",
  treasuryCustody: "token.governance.treasuryCustody",
};

const TIER_ORDER: DeployabilityTier[] = ["custom", "stated", "canhav"];
const TIER_TONES = { custom: "warning", stated: "neutral", canhav: "info" } as const;

/** Index of the Build section (M46), after the seven design sections (M131), and of Review after it. */
const BUILD_STEP = TOKEN_DESIGN_STEP_LABELS.length;
const REVIEW_STEP = BUILD_STEP + 1;

/** The fold under a section with the optional answers and the reading (M131). */
function More({ children }: { children: React.ReactNode }) {
  return (
    <Collapsible summary={TOKEN_EDITOR_COPY.more}>
      <p className="mb-4 text-xs text-ink-500">{TOKEN_EDITOR_COPY.moreHint}</p>
      <div className="space-y-5">{children}</div>
    </Collapsible>
  );
}

const COHORT_LABELS: Record<VestedCohort, string> = {
  team: "Team",
  investors: "Investors",
  advisors: "Advisors",
};

function NumberField({
  label,
  required,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  zeroAsEmpty,
  suffix,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Render 0 as an empty box (for fields where 0 means "not entered"). */
  zeroAsEmpty?: boolean;
  suffix?: string;
}) {
  const display =
    value === undefined || (zeroAsEmpty && value === 0) ? "" : String(value);
  return (
    <Field label={label} required={required} hint={hint}>
      <div className="relative">
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={display}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={suffix ? "pr-14" : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-500">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

export function TokenDesignEditor({
  id,
  initialDoc,
  initialStatus,
  initialSlug,
  deployedAddress,
  initialRev,
  linkedProjectId = null,
  linkedShapes = [],
  linkedChain = null,
  publishedMilestoneCount = null,
  curve = null,
  linkPanel,
}: {
  id: string;
  initialDoc: TokenDesignDoc;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  deployedAddress?: string | null;
  /** The draft's agent revision at load. Undefined before the database update (M39). */
  initialRev?: number;
  /** The linked project, for the token build steps (M46). */
  linkedProjectId?: string | null;
  /** The linked project's product shapes, for the shape advice and the fit warning (M47). */
  linkedShapes?: readonly ProductShape[];
  /** The linked project's chain, for the launch venue note and warning (M69). Null when unlinked. */
  linkedChain?: ProjectChain | null;
  /** How many milestones the published snapshot carries, null when unpublished (M48). */
  publishedMilestoneCount?: number | null;
  /** The deployed token's curve, for the computed build steps (M46). */
  curve?: Pick<IndexedCurve, "graduated" | "windowEnd"> | null;
  linkPanel?: React.ReactNode;
}) {
  const { doc, patch, patchSection } = useDraftDoc(initialDoc);
  const [step, setStep] = useState(0);

  const { save, stale } = useDraftSave("token-designs", id, initialRev);
  const saveState = useAutosave(doc, save);
  const { status: publishStatus, publish, unpublish } = usePublish("token-designs", id);

  const problems = useMemo(() => tokenDesignStepProblems(doc), [doc]);
  const overall = problems.overall;
  // Published in this session counts, so the computed publish row ticks at once.
  const published =
    publishStatus.kind === "published" ||
    (initialStatus === "published" && publishStatus.kind !== "unpublished");
  const slug = publishStatus.kind === "published" ? publishStatus.slug : initialSlug;
  const facts = useMemo<TokenLaunchFacts>(
    () => ({
      published,
      linked: linkedProjectId !== null,
      deployedAddress: deployedAddress ?? null,
      curve,
      now: Math.floor(Date.now() / 1000),
    }),
    [published, linkedProjectId, deployedAddress, curve],
  );
  const build = tokenBuildProgressOf(doc, facts);
  // Review hint about milestones (M48). Draft has none; draft has them but the
  // published snapshot does not; the launched token committed a snapshot without them.
  const draftMilestones = doc.postLaunch.milestones?.length ?? 0;
  const milestoneHint = !draftMilestones
    ? POST_LAUNCH_MILESTONE_COPY.missing
    : deployedAddress && (publishedMilestoneCount ?? 0) === 0
      ? POST_LAUNCH_MILESTONE_COPY.launched
      : published && (publishedMilestoneCount ?? 0) !== draftMilestones
        ? POST_LAUNCH_MILESTONE_COPY.republish
        : null;
  const steps = [
    ...TOKEN_DESIGN_STEP_LABELS.map((label, i) => ({ key: label, label, problem: problems.steps[i] })),
    {
      key: "build",
      label: TOKEN_STEPS_COPY.pillLabel(doc.ticker),
      variant: "product" as const,
      kicker: CHECKLIST_COPY.productKicker,
      problem: build.done === build.total ? null : TOKEN_STEPS_COPY.openProblem,
    },
    { key: "Review", label: "Review", problem: overall },
  ];
  const findings = useMemo(() => deployabilityFindings(doc), [doc]);

  const needed = vestedCohorts(doc.supply.allocations);

  function setCohort(cohort: VestedCohort, p: Partial<CohortVesting>) {
    const rows = [...doc.vesting.cohorts];
    const idx = rows.findIndex((r) => r.cohort === cohort);
    if (idx === -1) rows.push({ cohort, cliffMonths: 0, durationMonths: 0, ...p });
    else rows[idx] = { ...rows[idx], ...p };
    patchSection("vesting", { cohorts: rows });
  }

  const sale = doc.distribution.sale ?? {
    price: 0,
    hardCap: 0,
    softCap: 0,
    perWalletLimit: 0,
    access: "" as const,
    undersubscription: "" as const,
  };
  const atLaunch = doc.market.atLaunch ?? {
    liquidityEth: 0,
    ethSource: "",
    lp: "" as const,
    antiSniping: "" as const,
  };

  return (
    <EditorShell
      entity={{ kind: "token_design", id }}
      kicker="Token design"
      name={doc.name}
      logo={doc.logo ?? null}
      publicBase="/t"
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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {stale ? <StaleDraftNotice /> : null}
        <div className="max-w-2xl space-y-6">
          {step === 0 && (
            <>
              <ShapeAdviceCard shapes={linkedShapes} why={doc.rationale.why} />
              <SelectField
                label="Why does this need a token?"
                required
                value={doc.rationale.why}
                onChange={(v) => patchSection("rationale", { why: v })}
                options={RATIONALE_WHY_OPTIONS}
              />
              <SelectField
                label="Issue now and trade later, or straight to market?"
                required
                value={doc.rationale.path}
                onChange={(v) => patchSection("rationale", { path: v })}
                options={ISSUANCE_PATH_OPTIONS}
              />
              <TextField
                label="What does the token do that a database row couldn't?"
                required
                value={doc.rationale.beyondDatabaseRow}
                onChange={(v) => patchSection("rationale", { beyondDatabaseRow: v })}
                min={TOKEN_DESIGN_LIMITS.beyondDatabaseRow.min}
                max={TOKEN_DESIGN_LIMITS.beyondDatabaseRow.max}
                rows={3}
                placeholder="The economic work only a token can do here."
              />
              <More>
                <OptionResourceCard field="token.rationale.why" value={doc.rationale.why} />
                <OptionResourceCard field="token.rationale.path" value={doc.rationale.path} />
                <FieldIntroCard intro="token.rationale.beyondDatabaseRow" />
              </More>
            </>
          )}

          {step === 1 && (
            <>
              <TextField
                label="Token name"
                required
                hint="Deploys as-is up to 32 characters (letters, numbers, spaces). Longer names stay design-only."
                value={doc.name}
                onChange={(v) => patch({ name: v })}
                min={TOKEN_DESIGN_LIMITS.name.min}
                max={TOKEN_DESIGN_LIMITS.name.max}
              />
              {deployabilityFindings(doc).includes("name_not_deployable") && (
                <p className="text-sm leading-relaxed text-ink-300">{DEPLOYABILITY_COPY.name_not_deployable.text}</p>
              )}
              <Field label="Ticker" required hint={LAUNCH_FORM.ticker.hint}>
                <Input
                  value={doc.ticker}
                  onChange={(e) =>
                    patch({
                      ticker: e.target.value.toUpperCase().replace(LAUNCH_FORM.ticker.strip, ""),
                    })
                  }
                  maxLength={TOKEN_DESIGN_LIMITS.ticker.max}
                  placeholder="TOKEN"
                />
              </Field>
              <NameTickerCheck designId={id} name={doc.name} ticker={doc.ticker} />
              <NumberField
                label="Total supply"
                required
                value={doc.supply.total}
                onChange={(v) => patchSection("supply", { total: Math.floor(v) })}
                min={TOKEN_DESIGN_LIMITS.supplyTotal.min}
                max={TOKEN_DESIGN_LIMITS.supplyTotal.max}
                zeroAsEmpty
                suffix="tokens"
              />
              <SelectField
                label="Fixed or inflationary"
                required
                value={doc.supply.policy}
                onChange={(v) => patchSection("supply", { policy: v })}
                options={SUPPLY_POLICY_OPTIONS}
              />
              {doc.supply.policy === "inflationary" && (
                <TextField
                  label="Inflation schedule"
                  value={doc.supply.inflationNote ?? ""}
                  onChange={(v) => patchSection("supply", { inflationNote: v || undefined })}
                  max={TOKEN_DESIGN_LIMITS.inflationNote.max}
                  rows={2}
                  hint="Who mints, how much, on what schedule, and who governs it."
                />
              )}
              <AllocationSplitEditor
                value={doc.supply.allocations}
                onChange={(v) => patchSection("supply", { allocations: v })}
              />
              <More>
                <LogoField value={doc.logo} onChange={(logo) => patch({ logo })} hint={LOGO_COPY.designHint} />
                <OptionResourceCard field="token.supply.policy" value={doc.supply.policy} />
                <p className="text-xs leading-relaxed text-ink-400">{ALLOCATION_ENFORCEMENT_NOTE}</p>
              </More>
            </>
          )}

          {step === 2 &&
            (needed.length === 0 ? (
              <p className="text-sm leading-relaxed text-ink-300">
                No team, investor, or advisor allocations, so nothing to vest.
                Set allocations in the Supply step if that&apos;s not right.
              </p>
            ) : (
              <>
                {needed.map((cohort) => {
                  const row = doc.vesting.cohorts.find((r) => r.cohort === cohort);
                  return (
                    <div
                      key={cohort}
                      className="glass rounded-xl border border-ink-800/70 p-4"
                    >
                      <p className="text-sm font-medium text-ink-100">
                        {COHORT_LABELS[cohort]}, {doc.supply.allocations[cohort]}% of supply
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <NumberField
                          label="Cliff"
                          required
                          value={row?.cliffMonths}
                          onChange={(v) => setCohort(cohort, { cliffMonths: Math.floor(v) })}
                          min={TOKEN_DESIGN_LIMITS.vestingMonths.min}
                          max={TOKEN_DESIGN_LIMITS.vestingMonths.max}
                          suffix="months"
                        />
                        <NumberField
                          label="Total duration"
                          required
                          value={row?.durationMonths}
                          onChange={(v) => setCohort(cohort, { durationMonths: Math.floor(v) })}
                          min={TOKEN_DESIGN_LIMITS.vestingMonths.min}
                          max={TOKEN_DESIGN_LIMITS.vestingMonths.max}
                          suffix="months"
                        />
                      </div>
                    </div>
                  );
                })}
                <SelectField
                  label="Release type"
                  required
                  value={doc.vesting.release}
                  onChange={(v) => patchSection("vesting", { release: v })}
                  options={RELEASE_TYPE_OPTIONS}
                />
                <SelectField
                  label="If a founder leaves early"
                  required
                  value={doc.vesting.founderLeaves}
                  onChange={(v) => patchSection("vesting", { founderLeaves: v })}
                  options={FOUNDER_LEAVES_OPTIONS}
                />
                <More>
                  <OptionResourceCard field="token.vesting.release" value={doc.vesting.release} />
                  <OptionResourceCard field="token.vesting.founderLeaves" value={doc.vesting.founderLeaves} />
                </More>
              </>
            ))}

          {step === 3 && (
            <>
              <SelectField
                label="Is there a distribution event?"
                required
                value={doc.distribution.event}
                onChange={(v) =>
                  patch({
                    distribution: {
                      event: v,
                      sale: isSaleEvent(v) ? doc.distribution.sale : undefined,
                    },
                  })
                }
                options={DISTRIBUTION_EVENT_OPTIONS}
              />
              {isSaleEvent(doc.distribution.event) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Price"
                      required
                      value={sale.price}
                      onChange={(v) => patchSection("distribution", { sale: { ...sale, price: v } })}
                      min={0}
                      step={0.000001}
                      zeroAsEmpty
                      suffix="ETH"
                    />
                    <NumberField
                      label="Hard cap"
                      required
                      value={sale.hardCap}
                      onChange={(v) =>
                        patchSection("distribution", { sale: { ...sale, hardCap: v } })
                      }
                      min={0}
                      zeroAsEmpty
                      suffix="ETH"
                    />
                  </div>
                  <SelectField
                    label="Allowlist or open"
                    required
                    value={sale.access}
                    onChange={(v) => patchSection("distribution", { sale: { ...sale, access: v } })}
                    options={[
                      { value: "allowlist", label: "Allowlist" },
                      { value: "open", label: "Open" },
                    ]}
                  />
                  <SelectField
                    label="If the sale undersubscribes"
                    required
                    value={sale.undersubscription}
                    onChange={(v) =>
                      patchSection("distribution", { sale: { ...sale, undersubscription: v } })
                    }
                    options={UNDERSUBSCRIPTION_OPTIONS}
                  />
                </>
              )}
              <More>
                <OptionResourceCard field="token.distribution.event" value={doc.distribution.event} />
                {isSaleEvent(doc.distribution.event) ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField
                        label="Soft cap"
                        value={sale.softCap}
                        onChange={(v) =>
                          patchSection("distribution", { sale: { ...sale, softCap: v } })
                        }
                        min={0}
                        zeroAsEmpty
                        suffix="ETH"
                      />
                      <NumberField
                        label="Per-wallet limit"
                        value={sale.perWalletLimit}
                        onChange={(v) =>
                          patchSection("distribution", { sale: { ...sale, perWalletLimit: v } })
                        }
                        min={0}
                        zeroAsEmpty
                        suffix="ETH"
                      />
                    </div>
                    {sale.softCap > 0 && <FieldIntroCard intro="token.distribution.softCap" />}
                    <OptionResourceCard field="token.distribution.access" value={sale.access} />
                    <OptionResourceCard field="token.distribution.undersubscription" value={sale.undersubscription} />
                  </>
                ) : null}
              </More>
            </>
          )}

          {step === 4 && (
            <>
              <ChipRadioGroup
                label={LAUNCH_TARGET_COPY.label}
                info={
                  <>
                    <span className="block">{LAUNCH_TARGET_COPY.hint}</span>
                    {doc.market.launchTarget ? (
                      <span className="mt-2 block text-ink-400">{LAUNCH_TARGET_INFO[doc.market.launchTarget].blurb}</span>
                    ) : null}
                  </>
                }
                value={doc.market.launchTarget ?? ""}
                onChange={(v) => patchSection("market", { launchTarget: v })}
                options={LAUNCH_TARGET_OPTIONS}
              />
              {doc.market.launchTarget && launchTargetChainBound(doc.market.launchTarget) ? (
                linkedChain === "arbitrum_sepolia" ? (
                  <p className="text-sm leading-relaxed text-ink-300">{LAUNCH_TARGET_COPY.arbitrumNote(launchTargetLabel(doc.market.launchTarget))}</p>
                ) : linkedProjectId === null ? (
                  <p className="text-sm leading-relaxed text-ink-300">{LAUNCH_TARGET_COPY.unlinkedNote(launchTargetLabel(doc.market.launchTarget))}</p>
                ) : null
              ) : null}
              <SelectField
                label="Does a market exist at launch?"
                required
                value={doc.market.when}
                onChange={(v) =>
                  patch({
                    market: {
                      when: v,
                      atLaunch: v === "at_launch" ? doc.market.atLaunch : undefined,
                    },
                  })
                }
                options={MARKET_TIMING_OPTIONS}
              />
              {doc.market.when === "at_launch" && (
                <>
                  <NumberField
                    label="Liquidity amount"
                    required
                    value={atLaunch.liquidityEth}
                    onChange={(v) =>
                      patchSection("market", { atLaunch: { ...atLaunch, liquidityEth: v } })
                    }
                    min={0}
                    step={0.01}
                    zeroAsEmpty
                    suffix="ETH"
                  />
                  <TextField
                    label="Where does that ETH come from?"
                    required
                    value={atLaunch.ethSource}
                    onChange={(v) =>
                      patchSection("market", { atLaunch: { ...atLaunch, ethSource: v } })
                    }
                    min={TOKEN_DESIGN_LIMITS.ethSource.min}
                    max={TOKEN_DESIGN_LIMITS.ethSource.max}
                  />
                  <SelectField
                    label="LP treatment"
                    required
                    value={atLaunch.lp}
                    onChange={(v) =>
                      patchSection("market", { atLaunch: { ...atLaunch, lp: v } })
                    }
                    options={LP_TREATMENT_OPTIONS}
                  />
                  {atLaunch.lp === "locked" && (
                    <NumberField
                      label="Lock duration"
                      required
                      value={atLaunch.lpLockMonths}
                      onChange={(v) =>
                        patchSection("market", {
                          atLaunch: { ...atLaunch, lpLockMonths: Math.floor(v) || undefined },
                        })
                      }
                      min={TOKEN_DESIGN_LIMITS.lpLockMonths.min}
                      max={TOKEN_DESIGN_LIMITS.lpLockMonths.max}
                      zeroAsEmpty
                      suffix="months"
                    />
                  )}
                  <SelectField
                    label="Anti-sniping"
                    required
                    value={atLaunch.antiSniping}
                    onChange={(v) =>
                      patchSection("market", { atLaunch: { ...atLaunch, antiSniping: v } })
                    }
                    options={ANTI_SNIPING_OPTIONS}
                  />
                </>
              )}
              <More>
                <FieldIntroCard intro="token.market.when" />
                {doc.market.when === "at_launch" ? (
                  <>
                    <OptionResourceCard field="token.market.lp" value={atLaunch.lp} />
                    <OptionResourceCard field="token.market.antiSniping" value={atLaunch.antiSniping} />
                  </>
                ) : null}
                <div>
                  <p className="text-xs font-medium text-ink-200">{LAUNCH_TARGET_COPY.factsTitle}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-200">
                    {LAUNCH_TARGET_INFO[doc.market.launchTarget ?? "canhav_curve"].facts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                </div>
              </More>
            </>
          )}

          {step === 5 && (
            <>
              <p className="text-sm leading-relaxed text-ink-400">{GOVERNANCE_FRAMING}</p>
              <div className="space-y-5">
                {GOVERNANCE_FIELDS.map(({ key, label }) => (
                  <StatusDeclarationField
                    key={key}
                    label={label}
                    value={doc.governance[key]}
                    onChange={(v) => patchSection("governance", { [key]: v })}
                  />
                ))}
              </div>
              <More>
                {GOVERNANCE_FIELDS.map(({ key }) => (
                  <FieldIntroCard key={key} intro={GOVERNANCE_INTROS[key]} />
                ))}
                <div>
                  <p className="text-xs font-medium text-ink-200">Guaranteed by the contract, not a promise</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-200">
                    {GOVERNANCE_FACTS.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                  <a
                    href={explorerAddressUrl(launchChain().factoryAddress)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-xs text-electric-300 transition-colors hover:text-electric-200"
                  >
                    Verified factory on Blockscout →
                  </a>
                </div>
                <div className="space-y-5 border-t border-ink-700/40 pt-5">
                  <div>
                    <p className="text-sm font-medium text-ink-100">{TOKEN_EDITOR_COPY.postLaunch}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">{TOKEN_EDITOR_COPY.postLaunchLead}</p>
                  </div>
                  <FieldIntroCard intro="token.postLaunch.runwayMonths" />
                  <NumberField
                    label="Treasury runway"
                    value={doc.postLaunch.runwayMonths}
                    onChange={(v) =>
                      patchSection("postLaunch", {
                        runwayMonths: v > 0 ? Math.floor(v) : undefined,
                      })
                    }
                    min={TOKEN_DESIGN_LIMITS.runwayMonths.min}
                    max={TOKEN_DESIGN_LIMITS.runwayMonths.max}
                    zeroAsEmpty
                    suffix="months"
                  />
                  <FieldIntroCard intro="token.postLaunch.reporting" />
                  <SelectField
                    label="Reporting cadence"
                    value={doc.postLaunch.reporting ?? ""}
                    onChange={(v) => patchSection("postLaunch", { reporting: v || undefined })}
                    options={REPORTING_OPTIONS}
                  />
                  <FieldIntroCard intro="token.postLaunch.milestones" />
                  {doc.postLaunch.milestones ? (
                    <div className="space-y-3">
                      <MilestoneListFields
                        heading={POST_LAUNCH_MILESTONE_COPY.heading}
                        required={false}
                        milestones={doc.postLaunch.milestones}
                        onChange={(milestones) => patchSection("postLaunch", { milestones })}
                      />
                      <button
                        type="button"
                        onClick={() => patchSection("postLaunch", { milestones: undefined })}
                        className="text-xs text-ink-400 transition-colors hover:text-rose-400"
                      >
                        {POST_LAUNCH_MILESTONE_COPY.remove}
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patchSection("postLaunch", {
                          milestones: [
                            { date: "", title: "", description: "" },
                            { date: "", title: "", description: "" },
                          ],
                        })
                      }
                    >
                      {POST_LAUNCH_MILESTONE_COPY.add}
                    </Button>
                  )}
                </div>
              </More>
            </>
          )}

          {step === 6 && (
            <>
              <SelectField
                label="Legal status"
                required
                value={doc.legal.counsel}
                onChange={(v) => patchSection("legal", { counsel: v })}
                options={COUNSEL_OPTIONS}
              />
              <p className="text-xs leading-relaxed text-ink-400">{LEGAL_DISCLAIMER}</p>
              <More>
                <div>
                  <p className="text-xs font-medium text-ink-200">What typically matters</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-ink-200">
                    {LEGAL_TOPICS.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-5 border-t border-ink-700/40 pt-5">
                  <div>
                    <p className="text-sm font-medium text-ink-100">{TOKEN_EDITOR_COPY.postLaunch}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-400">{TOKEN_EDITOR_COPY.postLaunchLead}</p>
                  </div>
                  <FieldIntroCard intro="token.postLaunch.priceCollapsePlan" />
                  <TextField
                    label="If the price collapses, what do you do?"
                    value={doc.postLaunch.priceCollapsePlan ?? ""}
                    onChange={(v) => patchSection("postLaunch", { priceCollapsePlan: v || undefined })}
                    max={TOKEN_DESIGN_LIMITS.priceCollapsePlan.max}
                    rows={3}
                  />
                  <FieldIntroCard intro="token.postLaunch.failureCriteria" />
                  <TextField
                    label="What would make you call this a failure?"
                    value={doc.postLaunch.failureCriteria ?? ""}
                    onChange={(v) => patchSection("postLaunch", { failureCriteria: v || undefined })}
                    max={TOKEN_DESIGN_LIMITS.failureCriteria.max}
                    rows={3}
                  />
                </div>
              </More>
            </>
          )}

          {step === BUILD_STEP && (
            <TokenStepSection
              doc={doc}
              facts={facts}
              designId={id}
              slug={slug}
              linkedProjectId={linkedProjectId}
              onPatch={(partial) => patch(partial)}
              onJump={setStep}
            />
          )}

          {step === REVIEW_STEP && (
            <div className="space-y-5">
              <p className="inline-flex items-center gap-1 text-sm leading-relaxed text-ink-400">
                {PUBLISH_COPY.token.line}
                <InfoTip>{PUBLISH_COPY.token.more}</InfoTip>
              </p>
              <p className="text-xs text-ink-400">{TOKEN_STEPS_COPY.reviewRow(build.done, build.total)}</p>
              {milestoneHint ? (
                <StatusChip tone="info" variant="block">
                  {milestoneHint}
                </StatusChip>
              ) : null}
              {TIER_ORDER.map((tier) => {
                const inTier = findings.filter(
                  (code) => DEPLOYABILITY_COPY[code].tier === tier,
                );
                if (inTier.length === 0) return null;
                return (
                  <StatusChip key={tier} tone={TIER_TONES[tier]} variant="block">
                    <span className="block font-medium text-ink-100">
                      {DEPLOYABILITY_TIER_LABELS[tier]}
                    </span>
                    {inTier.map((code) => (
                      <span key={code} className="mt-1 block">
                        {DEPLOYABILITY_COPY[code].text}
                        {DEPLOYABILITY_COPY[code].fix && (
                          <span className="block font-medium text-ink-100">
                            {DEPLOYABILITY_COPY[code].fix}
                          </span>
                        )}
                      </span>
                    ))}
                  </StatusChip>
                );
              })}
              {initialStatus === "published" && !deployedAddress && (
                <p className="text-sm text-ink-400">
                  Already deployed this design?{" "}
                  <a
                    href={`/launch/attach?design=${id}`}
                    className="text-electric-300 transition-colors hover:text-electric-200"
                  >
                    Attach the contract →
                  </a>
                </p>
              )}
              {overall ? (
                <StatusChip tone="warning" variant="block">
                  Not ready to publish yet. {overall}
                </StatusChip>
              ) : (
                <StatusChip tone="success" variant="block">
                  Everything checks out. Publish from the button above. The
                  computed panel on the right is what readers will see first.
                </StatusChip>
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ComputedPanel doc={doc} shapes={linkedShapes} chain={linkedChain} />
        </div>
      </div>
      {linkPanel}
    </EditorShell>
  );
}
