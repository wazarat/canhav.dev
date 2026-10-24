"use client";

import { ArrowRight } from "lucide-react";

import { DomainSection } from "@/components/build/DomainSection";
import { FieldWaiver } from "@/components/build/FieldWaiver";
import { FIELD_GRID, TAB_WIDTH } from "@/components/build/layout";
import { InvestorPackSection } from "@/components/build/InvestorPackSection";
import { KitHandoff } from "@/components/ideation/kit/KitHandoff";
import { LogoField } from "@/components/ideation/LogoField";
import { NameWarning } from "@/components/ideation/NameWarning";
import { TextField } from "@/components/ideation/TextField";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { InfoTip } from "@/components/ui/InfoTip";
import { SegmentedField } from "@/components/ui/Segmented";
import { SelectField } from "@/components/ui/Select";
import { usePlan } from "@/components/studio/PlanContext";
import { BUILD_COPY, type BuildTab } from "@/content/build";
import {
  FIELD_STATE_COPY,
  FIRST_HUNDRED_LABEL,
  LOGO_COPY,
  PAYER_OPTIONS,
  PERSONA_COPY,
  ROBINHOOD_MYTH,
  STAGE_OPTIONS,
  audiencePersonaCards,
  optionLabel,
  sectorLabel,
  subsectorLabels,
} from "@/content/ideation";
import { shapeLabels, startingPointLabel } from "@/content/kits/copy";
import { buildProgress } from "@/content/kits/checklists";
import { launchTargetHandoffLine } from "@/content/launch-targets";
import { projectChainOf } from "@/lib/chains";
import { type ProblemArea, type ProjectProblems, tabOfArea } from "@/lib/build-readiness";
import { PROJECT_LIMITS, type ProjectDoc } from "@/lib/ideation";
import { fieldViews } from "@/lib/project-fields";
import { type LaunchTarget, launchTargetFit } from "@/lib/launch-targets";
import { PRIVATE_FREE_ALLOWANCE } from "@/lib/plan-shared";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";

/**
 * Public or private (M109). A free account has one private project; once
 * it is in use elsewhere the private option is closed and the Studio+ gate
 * says why. A project already published private keeps its slot.
 */
function VisibilityChoice({
  value,
  onChange,
  privateUsed,
  isPrivatePublished,
  chainLocked,
}: {
  value: "public" | "private";
  onChange: (v: "public" | "private") => void;
  privateUsed: number;
  isPrivatePublished: boolean;
  chainLocked: boolean;
}) {
  const V = BUILD_COPY.publish.visibility;
  const plan = usePlan();
  const plus = plan.plan === "studio_plus" && plan.hasFeature("private_projects");
  const capped = !plus && privateUsed >= PRIVATE_FREE_ALLOWANCE && !isPrivatePublished;
  // A project with a launched token stays public (M116).
  const closed = capped || chainLocked;
  const why = chainLocked ? V.launched : capped ? V.capReached : undefined;
  return (
    <div className="space-y-3">
      <SegmentedField
        label={V.label}
        hint={value === "private" ? V.privateHint : V.publicHint}
        value={value}
        onChange={onChange}
        options={[
          { value: "public", label: V.public },
          { value: "private", label: V.private, disabled: closed, title: why },
        ]}
      />
      {chainLocked ? <p className="text-xs text-ink-400">{V.launched}</p> : null}
      {plus ? null : capped ? (
        <p className="text-xs text-ink-400">{V.capReached}</p>
      ) : (
        <p className="text-xs text-ink-400">{privateUsed >= PRIVATE_FREE_ALLOWANCE || isPrivatePublished ? V.freeUsed : V.freeLeft}</p>
      )}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

function Row({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-ink-500">{term}</dt>
      <dd className="text-ink-200">{detail}</dd>
    </div>
  );
}

const AREAS: ReadonlyArray<Exclude<ProblemArea, "overall">> = ["building", "basics", "reality"];

/**
 * The Publish tab (M96): the fields of the public record that no other tab
 * holds, the readiness list naming the tab that still has open fields, and
 * the handoff downloads. Publishing stays on the header button.
 */
export function PublishTab({
  id,
  doc,
  patch,
  problems,
  linkedLaunchTarget,
  onGoTab,
  visibility,
  onVisibility,
  privateUsed,
  isPrivatePublished,
  chainLocked,
  agentMode,
}: {
  /** The project's agent write mode, for the pack's Draft buttons (M126). */
  agentMode: AgentWriteMode;
  id: string;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  problems: ProjectProblems;
  linkedLaunchTarget: LaunchTarget | null;
  onGoTab: (tab: BuildTab) => void;
  /** Public or private publish (M109). */
  visibility: "public" | "private";
  onVisibility: (v: "public" | "private") => void;
  /** The owner's other published private projects. */
  privateUsed: number;
  /** True when this project is already published private, which keeps its slot. */
  isPrivatePublished: boolean;
  /** True once a token launched from the project, which rules private out (M116). */
  chainLocked: boolean;
}) {
  const P = BUILD_COPY.publish;
  const chainKey = projectChainOf(doc);
  const kit = doc.kit;
  const build = buildProgress(kit);
  const open = AREAS.filter((area) => problems[area] !== null);
  // The recommended fields as they stand, each a row of the readiness list (M130).
  const fields = fieldViews(doc);
  // Studio+ sections show for a Studio+ session only (M136).
  const paid = usePlan().plan === "studio_plus";

  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection className="space-y-6">
          <Heading>{P.record}</Heading>
          <TextField
            label="Project name"
            required
            value={doc.name}
            onChange={(v) => patch({ name: v })}
            min={PROJECT_LIMITS.name.min}
            max={PROJECT_LIMITS.name.max}
            placeholder="What is this called?"
          />
          <NameWarning name={doc.name} />
          <LogoField value={doc.logo} onChange={(logo) => patch({ logo })} hint={LOGO_COPY.projectHint} />
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
          <div className={FIELD_GRID}>
            <SelectField
              label="Who pays"
              info="Often not the same answer as who the user is."
              value={doc.payer}
              onChange={(v) => patch({ payer: v })}
              options={PAYER_OPTIONS}
              clearable
            />
            <SelectField label="Current stage" required value={doc.stage} onChange={(v) => patch({ stage: v })} options={STAGE_OPTIONS} />
          </div>
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
          <FieldWaiver field="firstHundredUsers" doc={doc} patch={patch}>
            {chainKey === "robinhood_testnet" ? <p className="text-xs text-ink-400">{ROBINHOOD_MYTH.followUp}</p> : null}
            <TextField
              label={FIRST_HUNDRED_LABEL}
              value={doc.firstHundredUsers}
              onChange={(v) => patch({ firstHundredUsers: v })}
              min={PROJECT_LIMITS.firstHundredUsers.min}
              max={PROJECT_LIMITS.firstHundredUsers.max}
              rows={3}
              placeholder="Names of communities, channels, waitlists. The concrete plan."
            />
          </FieldWaiver>
          <div className={FIELD_GRID}>
            <Field label="GitHub repo" hint="owner/name" info="Linking it adds commit history to your public page.">
              <Input
                value={doc.githubRepo ?? ""}
                onChange={(e) => patch({ githubRepo: e.target.value.trim() || undefined })}
                placeholder="your-org/your-repo"
              />
            </Field>
            <Field label="Website" info="Shown on your public page." hint="https only.">
              <Input
                type="url"
                value={doc.website ?? ""}
                onChange={(e) => patch({ website: e.target.value.trim() || undefined })}
                placeholder="https://"
              />
            </Field>
          </div>
          {chainKey === "robinhood_testnet" ? (
            <>
              <p className="inline-flex items-center gap-1 text-sm font-medium text-ink-100">
                {ROBINHOOD_MYTH.title}
                <InfoTip>{ROBINHOOD_MYTH.body}</InfoTip>
              </p>
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
        </CardSection>

        <CardSection className="space-y-4">
          <Heading>{P.visibility.title}</Heading>
          <VisibilityChoice value={visibility} onChange={onVisibility} privateUsed={privateUsed} isPrivatePublished={isPrivatePublished} chainLocked={chainLocked} />
        </CardSection>

        {paid ? (
          <CardSection className="space-y-4">
            <Heading>{BUILD_COPY.domain.title}</Heading>
            <DomainSection projectId={id} />
          </CardSection>
        ) : null}

        <CardSection className="space-y-4">
          <Heading>{P.readiness}</Heading>
          <dl className="space-y-3 text-sm">
            <Row term="Sector" detail={sectorLabel(doc)} />
            {subsectorLabels(doc).length ? <Row term="Subsector" detail={subsectorLabels(doc).join(" · ")} /> : null}
            {kit?.shape ? (
              <>
                <Row term="Building" detail={shapeLabels(kit).join(" · ")} />
                <Row term="Starting from" detail={startingPointLabel(kit) ?? "Not set"} />
                <Row term="Build steps" detail={build.total ? `${build.done} of ${build.total} done` : "Not set"} />
              </>
            ) : null}
            <Row term="Stage" detail={optionLabel(STAGE_OPTIONS, doc.stage)} />
            {audiencePersonaCards(doc).map((cells, i) => (
              <Row key={i} term={PERSONA_COPY.column(i + 1)} detail={cells.map((c) => `${c.label} ${c.value}`).join(" · ")} />
            ))}
            {fields
              .filter((f) => !(f.key === "subsectors" && f.state === "stated"))
              .map((f) => (
                <Row key={f.key} term={f.label} detail={f.text} />
              ))}
          </dl>
          <p className="text-xs text-ink-400">{FIELD_STATE_COPY.recommended(fields.filter((f) => f.state === "missing").length)}</p>
          {open.length === 0 && problems.overall === null ? (
            <p className="text-sm leading-relaxed text-ink-300">{P.readinessLine}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-ink-300">
                {P.notReady} {problems.overall}
              </p>
              <ul className="space-y-1.5">
                {open.map((area) => {
                  const tab = tabOfArea(area);
                  return (
                    <li key={area} className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
                      <span>{problems[area]}</span>
                      {tab !== "publish" ? (
                        <Button size="sm" variant="ghost" onClick={() => onGoTab(tab)}>
                          {P.openIn(BUILD_COPY.tabs[tab])} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardSection>

        {paid ? (
          <CardSection className="space-y-4">
            <Heading>{STUDIO_PLUS_COPY.pack.title}</Heading>
            <InvestorPackSection projectId={id} doc={doc} patch={patch} agentMode={agentMode} />
          </CardSection>
        ) : null}

        {kit?.shape ? (
          <CardSection>
            <Heading>{P.handoff}</Heading>
            <KitHandoff
              projectId={id}
              name={doc.name}
              venueLine={
                linkedLaunchTarget ? launchTargetHandoffLine(linkedLaunchTarget, launchTargetFit(linkedLaunchTarget, chainKey)) : null
              }
            />
          </CardSection>
        ) : null}
      </Card>
    </div>
  );
}
