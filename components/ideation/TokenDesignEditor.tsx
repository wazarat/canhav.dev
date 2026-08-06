"use client";

import { useMemo, useState } from "react";

import { AllocationSplitEditor } from "@/components/ideation/AllocationSplitEditor";
import { ComputedPanel } from "@/components/ideation/ComputedPanel";
import { EditorShell } from "@/components/ideation/EditorShell";
import { SelectField } from "@/components/ideation/SelectField";
import { StatusDeclarationField } from "@/components/ideation/StatusDeclarationField";
import { TextField } from "@/components/ideation/TextField";
import { useAutosave } from "@/components/ideation/useAutosave";
import { useDraftDoc } from "@/components/ideation/useDraftDoc";
import { usePublish } from "@/components/ideation/usePublish";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { LAUNCH_CHAIN, LAUNCH_FORM } from "@/content/launch";
import {
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
  MARKET_FACTS,
  MARKET_TIMING_OPTIONS,
  RATIONALE_WHY_OPTIONS,
  RELEASE_TYPE_OPTIONS,
  REPORTING_OPTIONS,
  SUPPLY_POLICY_OPTIONS,
  UNDERSUBSCRIPTION_OPTIONS,
} from "@/content/ideation";
import { explorerAddressUrl } from "@/lib/explorer";
import {
  type CohortVesting,
  TOKEN_DESIGN_LIMITS,
  type TokenDesignDoc,
  type VestedCohort,
  isSaleEvent,
  validateTokenDesignDoc,
  vestedCohorts,
} from "@/lib/ideation";

const STEP_LABELS = [
  "Rationale",
  "Supply",
  "Vesting",
  "Distribution",
  "Market",
  "Governance",
  "Legal",
  "Post-launch",
  "Review",
] as const;

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

function stepProblems(doc: TokenDesignDoc): Array<string | null> {
  const L = TOKEN_DESIGN_LIMITS;
  const a = doc.supply.allocations;
  const sum =
    a.team + a.investors + a.treasuryEcosystem + a.public + a.liquidity + a.advisors + a.other;

  const rationale =
    !doc.rationale.why ||
    !doc.rationale.path ||
    doc.rationale.beyondDatabaseRow.trim().length < L.beyondDatabaseRow.min
      ? "Rationale incomplete"
      : null;

  const supply =
    doc.name.trim().length < L.name.min ||
    !doc.ticker.trim() ||
    doc.supply.total < L.supplyTotal.min ||
    !doc.supply.policy ||
    sum !== 100 ||
    (a.other > 0 && !a.otherLabel?.trim())
      ? "Supply incomplete"
      : null;

  const needed = vestedCohorts(a);
  const vesting =
    needed.length === 0
      ? null
      : needed.some((c) => !doc.vesting.cohorts.find((r) => r.cohort === c)) ||
          doc.vesting.cohorts.some((r) => r.cliffMonths > r.durationMonths) ||
          !doc.vesting.release ||
          !doc.vesting.founderLeaves
        ? "Vesting incomplete"
        : null;

  const s = doc.distribution.sale;
  const distribution = !doc.distribution.event
    ? "Distribution incomplete"
    : isSaleEvent(doc.distribution.event) &&
        (!s || !(s.price > 0) || !(s.hardCap > 0) || !s.access || !s.undersubscription)
      ? "Sale terms incomplete"
      : null;

  const m = doc.market.atLaunch;
  const market = !doc.market.when
    ? "Market incomplete"
    : doc.market.when === "at_launch" &&
        (!m || !(m.liquidityEth > 0) || m.ethSource.trim().length < L.ethSource.min || !m.lp || !m.antiSniping || (m.lp === "locked" && !m.lpLockMonths))
      ? "Launch-market terms incomplete"
      : null;

  const governance = Object.values(doc.governance).some(
    (d) => !["in_place", "legal_ops", "planned_before_mainnet", "not_yet"].includes(d.status),
  )
    ? "Governance incomplete"
    : null;

  const legal = doc.legal.counsel ? null : "Legal incomplete";

  return [
    rationale,
    supply,
    vesting,
    distribution,
    market,
    governance,
    legal,
    null, // post-launch is all optional
    validateTokenDesignDoc(doc),
  ];
}

export function TokenDesignEditor({
  id,
  initialDoc,
  initialStatus,
  initialSlug,
  linkPanel,
}: {
  id: string;
  initialDoc: TokenDesignDoc;
  initialStatus: "draft" | "published";
  initialSlug: string | null;
  linkPanel?: React.ReactNode;
}) {
  const { doc, patch, patchSection } = useDraftDoc(initialDoc);
  const [step, setStep] = useState(0);

  const saveState = useAutosave(doc, async (d) => {
    const res = await fetch(`/api/ideation/token-designs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ doc: d }),
    });
    if (!res.ok) throw new Error("save failed");
  });
  const { status: publishStatus, publish, unpublish } = usePublish("token-designs", id);

  const problems = useMemo(() => stepProblems(doc), [doc]);
  const overall = problems[8];
  const steps = STEP_LABELS.map((label, i) => ({ label, problem: problems[i] }));

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
      kicker="Token design"
      name={doc.name}
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
        <div className="max-w-2xl space-y-6">
          {step === 0 && (
            <>
              <SelectField
                label="Why does this need a token?"
                required
                value={doc.rationale.why}
                onChange={(v) => patchSection("rationale", { why: v })}
                options={RATIONALE_WHY_OPTIONS}
              />
              <SelectField
                label="Issue now, trade later — or straight to market?"
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
            </>
          )}

          {step === 1 && (
            <>
              <TextField
                label="Token name"
                required
                value={doc.name}
                onChange={(v) => patch({ name: v })}
                min={TOKEN_DESIGN_LIMITS.name.min}
                max={TOKEN_DESIGN_LIMITS.name.max}
              />
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
                  hint="The launch contract mints a fixed supply — inflation would live in your own contracts."
                />
              )}
              <AllocationSplitEditor
                value={doc.supply.allocations}
                onChange={(v) => patchSection("supply", { allocations: v })}
              />
            </>
          )}

          {step === 2 &&
            (needed.length === 0 ? (
              <StatusChip tone="info" variant="block">
                No team, investor, or advisor allocations — nothing to vest.
                Set allocations in the Supply step if that&apos;s not right.
              </StatusChip>
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
                        {COHORT_LABELS[cohort]} —{" "}
                        {doc.supply.allocations[cohort]}% of supply
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
            </>
          )}

          {step === 4 && (
            <>
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
              <StatusChip tone="info" variant="block">
                <span className="block font-medium text-ink-100">Fixed by the platform</span>
                {MARKET_FACTS.map((fact) => (
                  <span key={fact} className="mt-1 block">
                    {fact}
                  </span>
                ))}
              </StatusChip>
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
              <StatusChip tone="success" variant="block">
                <span className="block font-medium text-ink-100">
                  Guaranteed by the contract — not a promise
                </span>
                {GOVERNANCE_FACTS.map((fact) => (
                  <span key={fact} className="mt-1 block">
                    {fact}
                  </span>
                ))}
                <a
                  href={explorerAddressUrl(LAUNCH_CHAIN.factoryAddress)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-electric-300 transition-colors hover:text-electric-200"
                >
                  Verified factory on Blockscout →
                </a>
              </StatusChip>
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
              <div>
                <p className="text-xs font-medium text-ink-200">What typically matters</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-400">
                  {LEGAL_TOPICS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <StatusChip tone="neutral" variant="block">
                {LEGAL_DISCLAIMER}
              </StatusChip>
            </>
          )}

          {step === 7 && (
            <>
              <p className="text-sm leading-relaxed text-ink-400">
                All optional — but the teams that can answer these tend to
                still be here in two years.
              </p>
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
              <SelectField
                label="Reporting cadence"
                value={doc.postLaunch.reporting ?? ""}
                onChange={(v) => patchSection("postLaunch", { reporting: v || undefined })}
                options={REPORTING_OPTIONS}
              />
              <TextField
                label="If the price collapses, what do you do?"
                value={doc.postLaunch.priceCollapsePlan ?? ""}
                onChange={(v) => patchSection("postLaunch", { priceCollapsePlan: v || undefined })}
                max={TOKEN_DESIGN_LIMITS.priceCollapsePlan.max}
                rows={3}
              />
              <TextField
                label="What would make you call this a failure?"
                value={doc.postLaunch.failureCriteria ?? ""}
                onChange={(v) => patchSection("postLaunch", { failureCriteria: v || undefined })}
                max={TOKEN_DESIGN_LIMITS.failureCriteria.max}
                rows={3}
              />
            </>
          )}

          {step === 8 && (
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-ink-400">
                Publishing makes this design public and snapshots it. Deploying
                from a published design commits its hash on-chain — the design
                becomes tamper-evident forever.
              </p>
              {overall ? (
                <StatusChip tone="warning" variant="block">
                  Not ready to publish yet: {overall}
                </StatusChip>
              ) : (
                <StatusChip tone="success" variant="block">
                  Everything checks out. Publish from the button above — the
                  computed panel on the right is what readers will see first.
                </StatusChip>
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <ComputedPanel doc={doc} />
        </div>
      </div>
      {linkPanel}
    </EditorShell>
  );
}
