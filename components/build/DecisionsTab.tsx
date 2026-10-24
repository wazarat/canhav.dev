"use client";

import { PersonaTableEditor } from "@/components/ideation/PersonaTableEditor";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { FieldWaiver } from "@/components/build/FieldWaiver";
import { ChainField } from "@/components/ideation/ChainField";
import { TAB_WIDTH } from "@/components/build/layout";
import { ShapeChooser } from "@/components/build/ShapeChooser";
import type { AgentChangeRow } from "@/components/build/useAgentChanges";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { ExternalLink } from "lucide-react";

import { ExternalDepsEditor } from "@/components/ideation/ExternalDepsEditor";
import { WhyRowsEditor } from "@/components/ideation/WhyRowsEditor";
import { explorerAddressUrl } from "@/lib/explorer";
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
import { PROJECT_LIMITS, type ProjectDoc, docAudience, emptyConsumerPersona, emptyPersona, testnetContractRows } from "@/lib/ideation";
import { type ProjectKit, emptyProjectKit, setTemplateDecision } from "@/lib/kits";
import { kitsForDoc } from "@/content/kits";

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-semibold text-ink-50">{children}</h2>;
}

/**
 * The Decisions tab (M96): the choices with a reason behind them, each
 * editable in place. What is being built, the chain, the templates decided
 * on the Build tab, the architecture facts, the worst case and the five
 * security declarations, and the team's own files. The Studio+ market
 * and brand work sits on the Business model and Brand tabs. Every
 * section carries an id the sidebar scrolls to.
 */
export function DecisionsTab({
  id,
  agentMode,
  doc,
  patch,
  patchSection,
  chainLocked,
  earlier,
}: {
  id: string;
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
  // A row whose name matches a recorded testnet contract shows its address (M153).
  const recordedByLabel = new Map(testnetContractRows(doc).filter((c) => c.label?.trim()).map((c) => [c.label!.trim().toLowerCase(), c.address.toLowerCase()] as const));
  const audience = docAudience(doc);

  return (
    <div className={TAB_WIDTH}>
      <Card>
        <CardSection id="decisions-building" className="space-y-4">
          <Heading>{D.building}</Heading>
          <ShapeChooser doc={doc} patch={patch} />
          <FieldWaiver field="subsectors" doc={doc} patch={patch} />
          <FieldWaiver field="sectorOther" doc={doc} patch={patch} />
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
        </CardSection>

        <CardSection id="decisions-chain" className="space-y-4">
          <Heading>{D.chain}</Heading>
          <ChainField value={chainKey} onChange={(chain) => patch({ chain })} locked={chainLocked} />
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
          <FieldWaiver field="contracts" doc={doc} patch={patch}>
            <div className="space-y-3">
              {a.contractsLegacy ? (
                <div className="space-y-2 rounded-lg border border-ink-700/40 p-3">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-300">{a.contractsLegacy}</p>
                  <p className="text-xs text-ink-400">
                    {D.contractRows.legacy}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        const { contractsLegacy: _l, ...rest } = a;
                        patch({ architecture: rest });
                      }}
                      className="text-ink-300 transition-colors hover:text-ink-50 hover:underline"
                    >
                      {D.contractRows.legacyRemove}
                    </button>
                  </p>
                </div>
              ) : null}
              <WhyRowsEditor
                rows={a.contracts}
                none={a.contractsNone}
                onChange={(contracts, contractsNone) => patchSection("architecture", { contracts, contractsNone })}
                max={PROJECT_LIMITS.whyEntries.max}
                copy={D.contractRows}
                empty={() => ({ name: "", why: "" })}
                beside={(row) => {
                  const hit = recordedByLabel.get(row.name.trim().toLowerCase());
                  return hit ? (
                    <a href={explorerAddressUrl(hit, chainKey)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-electric-300 transition-colors hover:text-electric-200">
                      {D.contractRows.onChain(`${hit.slice(0, 6)}…${hit.slice(-4)}`)} <ExternalLink aria-hidden className="h-3 w-3" />
                    </a>
                  ) : null;
                }}
              />
            </div>
          </FieldWaiver>
          <FieldWaiver field="externalDeps" doc={doc} patch={patch}>
            <ExternalDepsEditor
              deps={a.externalDeps}
              none={a.externalDepsNone}
              onChange={(deps, none) => patchSection("architecture", { externalDeps: deps, externalDepsNone: none })}
            />
          </FieldWaiver>
          <FieldWaiver field="oracles" doc={doc} patch={patch}>
            <div className="space-y-6">
              <SelectField
                label="Oracles"
                hint="Anything that feeds prices or data into your contracts."
                value={a.oracleUse}
                onChange={(v) => patchSection("architecture", { oracleUse: v })}
                options={ORACLE_USE_OPTIONS}
              />
              {a.oracleUse === "uses" && (
                <TextField
                  label="Which oracles, and for what?"
                  value={a.oracles}
                  onChange={(v) => patchSection("architecture", { oracles: v })}
                  min={PROJECT_LIMITS.architectureField.min}
                  max={PROJECT_LIMITS.architectureField.max}
                  rows={2}
                />
              )}
            </div>
          </FieldWaiver>
          <FieldWaiver field="adminFunctions" doc={doc} patch={patch}>
            <TextField
              label="Admin functions, and why they exist"
              info='"None" is a valid and strong answer for immutable contracts. Say so explicitly.'
              value={a.adminFunctions}
              onChange={(v) => patchSection("architecture", { adminFunctions: v })}
              min={PROJECT_LIMITS.architectureField.min}
              max={PROJECT_LIMITS.architectureField.max}
              rows={3}
            />
          </FieldWaiver>
          <FieldWaiver field="upgradeability" doc={doc} patch={patch}>
            <SelectField
              label="Upgradeability"
              value={a.upgradeability}
              onChange={(v) => patchSection("architecture", { upgradeability: v })}
              options={UPGRADEABILITY_OPTIONS}
            />
          </FieldWaiver>
        </CardSection>

        <CardSection id="decisions-security" className="space-y-5">
          <Heading>{D.security}</Heading>
          <FieldWaiver field="worstCase" doc={doc} patch={patch}>
            <SelectField
              label="What's the worst thing a bug could do?"
              value={doc.worstCase}
              onChange={(v) => patch({ worstCase: v })}
              options={WORST_CASE_OPTIONS}
            />
            {doc.worstCase && (
              <Collapsible summary={WORST_CASE_WHY}>
                <p className="text-xs leading-relaxed text-ink-200">{WORST_CASE_PRESSURE[doc.worstCase]}</p>
              </Collapsible>
            )}
          </FieldWaiver>
          {PROJECT_SECURITY_FIELDS.map(({ key, label }) => (
            <FieldWaiver key={key} field={key} doc={doc} patch={patch}>
              <StatusDeclarationField label={label} value={doc.security[key]} onChange={(v) => patchSection("security", { [key]: v })} />
            </FieldWaiver>
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
