"use client";

import { ArrowRight } from "lucide-react";

import { KitHandoff } from "@/components/ideation/kit/KitHandoff";
import { LogoField } from "@/components/ideation/LogoField";
import { PersonaTableEditor } from "@/components/ideation/PersonaTableEditor";
import { TextField } from "@/components/ideation/TextField";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { Field, Input } from "@/components/ui/Input";
import { InfoTip } from "@/components/ui/InfoTip";
import { SegmentedField } from "@/components/ui/Segmented";
import { SelectField } from "@/components/ui/Select";
import { PlusGate } from "@/components/studio/PlusGate";
import { usePlan } from "@/components/studio/PlanContext";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY, type BuildTab } from "@/content/build";
import {
  AUDIENCE_OPTIONS,
  LOGO_COPY,
  PAYER_OPTIONS,
  PERSONA_COPY,
  PROJECT_SECURITY_FIELDS,
  ROBINHOOD_MYTH,
  STAGE_OPTIONS,
  STATUS_DECL_LABELS,
  WORST_CASE_OPTIONS,
  audiencePersonaCards,
  optionLabel,
  personaRows,
  sectorLabel,
  subsectorLabels,
} from "@/content/ideation";
import { shapeLabels, startingPointLabel } from "@/content/kits/copy";
import { buildProgress } from "@/content/kits/checklists";
import { launchTargetHandoffLine } from "@/content/launch-targets";
import { projectChainOf } from "@/lib/chains";
import { type ProblemArea, type ProjectProblems, tabOfArea } from "@/lib/build-readiness";
import { PROJECT_LIMITS, type ProjectDoc, docAudience, emptyConsumerPersona, emptyPersona } from "@/lib/ideation";
import { type LaunchTarget, launchTargetFit } from "@/lib/launch-targets";
import { PRIVATE_FREE_ALLOWANCE } from "@/lib/plan-shared";

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
}: {
  value: "public" | "private";
  onChange: (v: "public" | "private") => void;
  privateUsed: number;
  isPrivatePublished: boolean;
}) {
  const V = BUILD_COPY.publish.visibility;
  const plan = usePlan();
  const plus = plan.plan === "studio_plus" && plan.hasFeature("private_projects");
  const closed = !plus && privateUsed >= PRIVATE_FREE_ALLOWANCE && !isPrivatePublished;
  return (
    <div className="space-y-3">
      <SegmentedField
        label={V.label}
        hint={value === "private" ? V.privateHint : V.publicHint}
        value={value}
        onChange={onChange}
        options={[
          { value: "public", label: V.public },
          { value: "private", label: V.private, disabled: closed, title: closed ? V.capReached : undefined },
        ]}
      />
      {plus ? null : closed ? (
        <PlusGate feature="private_projects" />
      ) : (
        <StatusChip tone="neutral">{privateUsed >= PRIVATE_FREE_ALLOWANCE || isPrivatePublished ? V.freeUsed : V.freeLeft}</StatusChip>
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

const AREAS: ReadonlyArray<Exclude<ProblemArea, "overall">> = ["basics", "architecture", "security", "reality"];

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
}: {
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
}) {
  const P = BUILD_COPY.publish;
  const chainKey = projectChainOf(doc);
  const audience = docAudience(doc);
  const kit = doc.kit;
  const build = buildProgress(kit);
  const open = AREAS.filter((area) => problems[area] !== null);

  return (
    <div className="max-w-2xl">
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
          <ChipRadioGroup
            label={PERSONA_COPY.audienceLabel}
            info={audience ? PERSONA_COPY.audienceHints[audience] : PERSONA_COPY.audienceHint}
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
          <SelectField
            label="Who pays"
            info="Often not the same answer as who the user is."
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
          <SelectField label="Current stage" required value={doc.stage} onChange={(v) => patch({ stage: v })} options={STAGE_OPTIONS} />
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
          {chainKey === "robinhood_testnet" ? (
            <>
              <StatusChip tone="warning" variant="block">
                <span className="inline-flex items-center gap-1 font-medium text-ink-100">
                  {ROBINHOOD_MYTH.title}
                  <InfoTip>{ROBINHOOD_MYTH.body}</InfoTip>
                </span>
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
        </CardSection>

        <CardSection className="space-y-4">
          <Heading>{P.visibility.title}</Heading>
          <VisibilityChoice value={visibility} onChange={onVisibility} privateUsed={privateUsed} isPrivatePublished={isPrivatePublished} />
        </CardSection>

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
            <Row term="Worst case" detail={optionLabel(WORST_CASE_OPTIONS, doc.worstCase)} />
            <Row
              term="Security"
              detail={PROJECT_SECURITY_FIELDS.map(({ key, label }) => {
                const v = doc.security[key].status ? STATUS_DECL_LABELS[doc.security[key].status] : "Not set";
                return `${label} ${v.charAt(0).toLowerCase()}${v.slice(1)}`;
              }).join(" · ")}
            />
          </dl>
          {open.length === 0 && problems.overall === null ? (
            <StatusChip tone="success" variant="block">
              {P.readinessLine}
            </StatusChip>
          ) : (
            <div className="space-y-2">
              <StatusChip tone="warning" variant="block">
                {P.notReady} {problems.overall}
              </StatusChip>
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
