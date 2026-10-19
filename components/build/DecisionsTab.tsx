"use client";

import { BrandEditor } from "@/components/build/BrandEditor";
import { CanvasEditor } from "@/components/build/CanvasEditor";
import { CompetitorsSection } from "@/components/build/CompetitorsSection";
import { IcpEditor } from "@/components/build/IcpEditor";
import { PersonaTableEditor } from "@/components/ideation/PersonaTableEditor";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { ShapeChooser } from "@/components/build/ShapeChooser";
import { PlusGate } from "@/components/studio/PlusGate";
import type { AgentChangeRow } from "@/components/build/useAgentChanges";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { ExternalDepsEditor } from "@/components/ideation/ExternalDepsEditor";
import { ReferencesEditor } from "@/components/ideation/ReferencesEditor";
import { StatusDeclarationField } from "@/components/ideation/StatusDeclarationField";
import { TextField } from "@/components/ideation/TextField";
import { Card, CardSection } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { SegmentedField } from "@/components/ui/Segmented";
import { SelectField } from "@/components/ui/Select";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import {
  AUDIENCE_OPTIONS,
  CHAIN_COPY,
  ORACLE_USE_OPTIONS,
  PERSONA_COPY,
  personaRows,
  PROJECT_SECURITY_FIELDS,
  UPGRADEABILITY_OPTIONS,
  WORST_CASE_OPTIONS,
  WORST_CASE_PRESSURE,
} from "@/content/ideation";
import { WORST_CASE_WHY } from "@/content/ideation";
import { templateById } from "@/content/templates";
import { TEMPLATE_COPY } from "@/content/templates/copy";
import { type ProjectChain, projectChainOf } from "@/lib/chains";
import { PROJECT_LIMITS, type ProjectDoc, docAudience, emptyConsumerPersona, emptyPersona } from "@/lib/ideation";
import { type ProjectKit, emptyProjectKit, setTemplateDecision } from "@/lib/kits";
import { kitsForDoc } from "@/content/kits";

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

/**
 * The Decisions tab (M96): the choices with a reason behind them, each
 * editable in place. What is being built, the chain, the templates decided
 * on the Build tab, the architecture facts, the worst case and the five
 * security declarations, and the team's own files, plus the Business
 * Model Canvas (M113, Studio+). Every section carries an id the sidebar
 * scrolls to.
 */
export function DecisionsTab({
  id,
  createdAt,
  agentMode,
  doc,
  patch,
  patchSection,
  chainLocked,
  earlier,
}: {
  id: string;
  /** ISO time the project was started, for the project's age on the competitor map (M115). */
  createdAt: string;
  /** The project's agent write mode, which decides whether Draft asks the agent first (M117). */
  agentMode: AgentWriteMode;
  doc: ProjectDoc;
  patch: (p: Partial<ProjectDoc>) => void;
  patchSection: <K extends keyof ProjectDoc>(key: K, p: Partial<ProjectDoc[K]>) => void;
  chainLocked: boolean;
  /** Decided agent changes, for the note beside a template an agent decided. */
  earlier: AgentChangeRow[];
}) {
  const D = BUILD_COPY.decisions;
  const kit = doc.kit;
  const chainKey = projectChainOf(doc);
  const patchKit = (partial: Partial<ProjectKit>) => patch({ kit: { ...(kit ?? emptyProjectKit(kitsForDoc(doc))), ...partial } });
  const decided = Object.entries(kit?.templates ?? {})
    .map(([id, decision]) => ({ id, decision, template: templateById(id) }))
    .filter((t) => t.template);
  /** The newest agent change that touched this template's decision, by its line path. */
  const agentNote = (id: string) =>
    earlier.find((c) => c.note && c.lines.some((l) => l.path.includes("templates") && l.path.includes(id)));
  const a = doc.architecture;
  const audience = docAudience(doc);

  return (
    <div className="max-w-2xl">
      <Card>
        <CardSection id="decisions-building" className="space-y-4">
          <Heading>{D.building}</Heading>
          <ShapeChooser doc={doc} patch={patch} />
        </CardSection>

        <CardSection id="decisions-customers" className="space-y-5">
          <Heading>{D.customers}</Heading>
          <ChipRadioGroup
            label={PERSONA_COPY.audienceLabel}
            info={audience ? PERSONA_COPY.audienceHints[audience] : PERSONA_COPY.audienceHint}
            value={audience}
            onChange={(v) => patch({ audience: v })}
            options={AUDIENCE_OPTIONS}
          />
          {audience === "b2b" ? (
            <PersonaTableEditor rows={personaRows("b2b")} personas={doc.personas} onChange={(personas) => patch({ personas })} empty={emptyPersona} note={PERSONA_COPY.note} />
          ) : audience === "b2c" ? (
            <PersonaTableEditor rows={personaRows("b2c")} personas={doc.consumerPersonas} onChange={(consumerPersonas) => patch({ consumerPersonas })} empty={emptyConsumerPersona} note={PERSONA_COPY.note} />
          ) : null}
          <div id="decisions-icp" className="space-y-2 border-t border-ink-700/40 pt-5">
            <Heading>{D.icp}</Heading>
            <PlusGate feature="icp">
              <IcpEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} profiles={doc.icp} onChange={(icp) => patch({ icp })} />
            </PlusGate>
          </div>
        </CardSection>

        <CardSection id="decisions-canvas" className="space-y-4">
          <Heading>{D.canvas}</Heading>
          <PlusGate feature="bmc">
            <CanvasEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} canvas={doc.canvas} onChange={(canvas) => patch({ canvas })} />
          </PlusGate>
        </CardSection>

        <CardSection id="decisions-competitors" className="space-y-4">
          <Heading>{D.competitors}</Heading>
          <PlusGate feature="competitors">
            <CompetitorsSection projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} createdAt={createdAt} value={doc.competitors} onChange={(competitors) => patch({ competitors })} />
          </PlusGate>
        </CardSection>

        <CardSection id="decisions-brand" className="space-y-4">
          <Heading>{D.brand}</Heading>
          <PlusGate feature="brand">
            <BrandEditor projectId={id} name={doc.name} meta={doc} patch={patch} agentMode={agentMode} brand={doc.brand} hasLogo={Boolean(doc.logo)} onChange={(brand) => patch({ brand })} />
          </PlusGate>
        </CardSection>

        <CardSection id="decisions-chain" className="space-y-4">
          <Heading>{D.chain}</Heading>
          <SegmentedField
            label={CHAIN_COPY.label}
            hint={chainLocked ? CHAIN_COPY.locked : undefined}
            info={CHAIN_COPY.hint}
            value={chainKey}
            onChange={(v) => {
              if (!chainLocked) patch({ chain: v as ProjectChain });
            }}
            options={CHAIN_COPY.options.map((o) => (chainLocked && o.value !== chainKey ? { ...o, disabled: true } : o))}
          />
        </CardSection>

        <CardSection id="decisions-templates" className="space-y-3">
          <Heading>{D.templates}</Heading>
          {decided.length === 0 ? (
            <p className="text-xs text-ink-500">{D.templatesEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {decided.map(({ id, decision, template }) => {
                const note = agentNote(id);
                return (
                  <li key={id} className="flex flex-wrap items-center gap-2 text-sm">
                    <a href={template!.repoUrl} target="_blank" rel="noreferrer" className="text-ink-100 transition-colors hover:text-electric-200">
                      {template!.name}
                    </a>
                    <StatusChip tone={TEMPLATE_COPY.stateTone[decision]} className="px-2 py-0.5 text-[11px]">
                      {TEMPLATE_COPY.state[decision]}
                    </StatusChip>
                    {note ? (
                      <span className="text-[11px] text-ink-500">
                        {D.agentNote(new Date(note.createdAt).toLocaleDateString("en-US"))}. {note.note}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => kit && patchKit(setTemplateDecision(kit, id, null))}
                      className="text-[11px] text-ink-400 transition-colors hover:text-ink-100"
                    >
                      {BUILD_COPY.row.undo}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardSection>

        <CardSection id="decisions-contracts" className="space-y-6">
          <Heading>{D.contracts}</Heading>
          <TextField
            label="What contracts exist"
            required
            hint='"None yet" is an honest answer.'
            value={a.contracts}
            onChange={(v) => patchSection("architecture", { contracts: v })}
            min={PROJECT_LIMITS.architectureField.min}
            max={PROJECT_LIMITS.architectureField.max}
            rows={3}
          />
          <ExternalDepsEditor
            deps={a.externalDeps}
            none={a.externalDepsNone}
            onChange={(deps, none) => patchSection("architecture", { externalDeps: deps, externalDepsNone: none })}
          />
          <SelectField
            label="Oracles"
            required
            hint="Anything that feeds prices or data into your contracts."
            value={a.oracleUse}
            onChange={(v) => patchSection("architecture", { oracleUse: v })}
            options={ORACLE_USE_OPTIONS}
          />
          {a.oracleUse === "uses" && (
            <TextField
              label="Which oracles, and for what?"
              required
              value={a.oracles}
              onChange={(v) => patchSection("architecture", { oracles: v })}
              min={PROJECT_LIMITS.architectureField.min}
              max={PROJECT_LIMITS.architectureField.max}
              rows={2}
            />
          )}
          <TextField
            label="Admin functions, and why they exist"
            required
            info='"None" is a valid and strong answer for immutable contracts. Say so explicitly.'
            value={a.adminFunctions}
            onChange={(v) => patchSection("architecture", { adminFunctions: v })}
            min={PROJECT_LIMITS.architectureField.min}
            max={PROJECT_LIMITS.architectureField.max}
            rows={3}
          />
          <SelectField
            label="Upgradeability"
            required
            value={a.upgradeability}
            onChange={(v) => patchSection("architecture", { upgradeability: v })}
            options={UPGRADEABILITY_OPTIONS}
          />
        </CardSection>

        <CardSection id="decisions-security" className="space-y-5">
          <Heading>{D.security}</Heading>
          <SelectField
            label="What's the worst thing a bug could do?"
            required
            value={doc.worstCase}
            onChange={(v) => patch({ worstCase: v })}
            options={WORST_CASE_OPTIONS}
          />
          {doc.worstCase && (
            <Collapsible summary={WORST_CASE_WHY}>
              <p className="text-xs leading-relaxed text-ink-200">{WORST_CASE_PRESSURE[doc.worstCase]}</p>
            </Collapsible>
          )}
          {PROJECT_SECURITY_FIELDS.map(({ key, label }) => (
            <StatusDeclarationField
              key={key}
              label={label}
              value={doc.security[key]}
              onChange={(v) => patchSection("security", { [key]: v })}
            />
          ))}
        </CardSection>

        <CardSection id="decisions-files" className="space-y-4">
          <Heading>{D.files}</Heading>
          <ReferencesEditor references={doc.references ?? []} onChange={(references) => patch({ references })} />
        </CardSection>
      </Card>
    </div>
  );
}
