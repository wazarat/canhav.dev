"use client";

import { useMemo, useState } from "react";

import { EditorShell } from "@/components/ideation/EditorShell";
import { SelectField } from "@/components/ideation/SelectField";
import { StatusDeclarationField } from "@/components/ideation/StatusDeclarationField";
import { TextField } from "@/components/ideation/TextField";
import { useAutosave } from "@/components/ideation/useAutosave";
import { useDraftDoc } from "@/components/ideation/useDraftDoc";
import { usePublish } from "@/components/ideation/usePublish";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { ExternalDepsEditor } from "@/components/ideation/ExternalDepsEditor";
import {
  ORACLE_USE_OPTIONS,
  PAYER_OPTIONS,
  PROJECT_SECURITY_FIELDS,
  ROBINHOOD_MYTH,
  SECTOR_OPTIONS,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  WORST_CASE_PRESSURE,
  optionLabel,
} from "@/content/ideation";
import { PROJECT_LIMITS, type ProjectDoc, validateProjectDoc } from "@/lib/ideation";

const STEP_LABELS = ["Basics", "Architecture", "Security", "Reality", "Review"] as const;

function stepProblems(doc: ProjectDoc): Array<string | null> {
  const L = PROJECT_LIMITS;
  const short = (v: string, min: number) => v.trim().length < min;

  const basics =
    short(doc.name, L.name.min) ||
    !doc.sector ||
    (doc.sector === "other" && !doc.sectorOther?.trim()) ||
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
            <SelectField
              label="Sector"
              required
              value={doc.sector}
              onChange={(v) => patch({ sector: v })}
              options={SECTOR_OPTIONS}
            />
            {doc.sector === "other" && (
              <TextField
                label="Which sector?"
                required
                value={doc.sectorOther ?? ""}
                onChange={(v) => patch({ sectorOther: v })}
                max={PROJECT_LIMITS.sectorOther.max}
              />
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
              hint="One 0x address per line. We read deploy history from the chain: the addresses are the claim, the chain is the evidence."
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
              <ReviewRow term="Sector" detail={optionLabel(SECTOR_OPTIONS, doc.sector)} />
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
                  ({ key, label }) =>
                    `${label}: ${doc.security[key].status ? STATUS_DECL_LABELS[doc.security[key].status] : "Not set"}`,
                ).join(" · ")}
              />
            </dl>
            {overall ? (
              <StatusChip tone="warning" variant="block">
                Not ready to publish yet: {overall}
              </StatusChip>
            ) : (
              <StatusChip tone="success" variant="block">
                Everything checks out. Publish from the button above.
              </StatusChip>
            )}
          </div>
        )}
      </div>
      {linkPanel}
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
