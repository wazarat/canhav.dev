import { FIELD_STATE_COPY, STATUS_DECL_LABELS, UPGRADEABILITY_OPTIONS, WAIVABLE_FIELD_LABELS, WORST_CASE_OPTIONS, optionLabel } from "@/content/ideation";
import { PROJECT_LIMITS, type ProjectDoc, WAIVABLE_FIELDS, type WaivableField } from "@/lib/ideation";
import { SECTOR_SUBSECTORS, docSectors, requiresSubsector } from "@/lib/sectors";

/**
 * The recommended fields of a project record (M130). Publishing needs the
 * name, a sector, what it does, the stage and the Robinhood acknowledgement;
 * everything else that used to block is recommended. A recommended field is
 * stated, waived (the team said it does not apply and why) or missing, and a
 * missing one publishes as "Not stated". Pure, shared by the editor, the
 * public page, the exports and the MCP tools.
 */
export type FieldState = "stated" | "waived" | "missing" | "skip";

export interface FieldView {
  key: WaivableField;
  label: string;
  state: FieldState;
  /** What a reader sees: the value, "Not applicable, reason" or "Not stated". Empty for skip. */
  text: string;
}

/** The tab that edits each recommended field. */
export const FIELD_TAB: Record<WaivableField, "decisions" | "publish"> = {
  subsectors: "decisions",
  sectorOther: "decisions",
  contracts: "decisions",
  externalDeps: "decisions",
  oracles: "decisions",
  adminFunctions: "decisions",
  upgradeability: "decisions",
  worstCase: "decisions",
  audit: "decisions",
  bugBounty: "decisions",
  monitoring: "decisions",
  incidentResponse: "decisions",
  keyCustody: "decisions",
  firstHundredUsers: "publish",
};

const SECURITY_KEYS = ["audit", "bugBounty", "monitoring", "incidentResponse", "keyCustody"] as const;
type SecurityKey = (typeof SECURITY_KEYS)[number];

function isSecurity(key: WaivableField): key is SecurityKey {
  return (SECURITY_KEYS as readonly string[]).includes(key);
}

/** The waiver reason for a field, or null. */
export function waiverOf(doc: Pick<ProjectDoc, "waived">, key: WaivableField): string | null {
  const v = doc.waived?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** The stated value as text, or null when the field is empty. */
function statedText(doc: ProjectDoc, key: WaivableField): string | null {
  const L = PROJECT_LIMITS;
  const a = doc.architecture;
  const long = (v: string, min: number) => (v.trim().length >= min ? v.trim() : null);
  switch (key) {
    case "subsectors": {
      const subs = doc.subsectors ?? [];
      const sectors = docSectors(doc);
      const asked = sectors.filter((s) => requiresSubsector(s));
      if (asked.length === 0) return "";
      const covered = asked.every((s) => subs.some((v) => SECTOR_SUBSECTORS[s].includes(v)));
      return covered ? subs.join(", ") : null;
    }
    case "sectorOther": {
      const sectors = docSectors(doc);
      if (!sectors.includes("other")) return "";
      if ((doc.subsectors ?? []).some((v) => SECTOR_SUBSECTORS.other.includes(v))) return "";
      return doc.sectorOther?.trim() || null;
    }
    case "contracts":
      // Rows, the honest None yet, or the answer from before M153.
      if (a.contracts.length) return a.contracts.map((c) => c.name).join(", ");
      if (a.contractsNone) return FIELD_STATE_COPY.noneYet;
      return a.contractsLegacy?.trim() ? a.contractsLegacy.trim() : null;
    case "externalDeps":
      if (a.externalDepsNone) return FIELD_STATE_COPY.none;
      return a.externalDeps.length ? a.externalDeps.map((d) => d.name).join(", ") : null;
    case "oracles":
      if (a.oracleUse === "none") return FIELD_STATE_COPY.none;
      if (a.oracleUse === "uses") return long(a.oracles, L.architectureField.min);
      return null;
    case "adminFunctions":
      return long(a.adminFunctions, L.architectureField.min);
    case "upgradeability":
      return a.upgradeability ? optionLabel(UPGRADEABILITY_OPTIONS, a.upgradeability) : null;
    case "worstCase":
      return doc.worstCase ? optionLabel(WORST_CASE_OPTIONS, doc.worstCase) : null;
    case "firstHundredUsers":
      return long(doc.firstHundredUsers, L.firstHundredUsers.min);
    default: {
      if (isSecurity(key)) {
        const d = doc.security[key];
        const label = d.status ? STATUS_DECL_LABELS[d.status] : undefined;
        return label ? `${label}${d.note ? `, ${d.note}` : ""}` : null;
      }
      return null;
    }
  }
}

/**
 * Where one recommended field stands. "skip" means the record does not ask
 * it (a subsector when no sector has them, the Other description when a
 * subsector was picked). A stated value wins over a waiver.
 */
export function fieldState(doc: ProjectDoc, key: WaivableField): FieldView {
  const label = WAIVABLE_FIELD_LABELS[key];
  const stated = statedText(doc, key);
  if (stated === "") return { key, label, state: "skip", text: "" };
  if (stated !== null) return { key, label, state: "stated", text: stated };
  const reason = waiverOf(doc, key);
  if (reason) return { key, label, state: "waived", text: FIELD_STATE_COPY.notApplicable(reason) };
  return { key, label, state: "missing", text: FIELD_STATE_COPY.notStated };
}

/** Every recommended field the record asks, in editor order. */
export function fieldViews(doc: ProjectDoc): FieldView[] {
  return WAIVABLE_FIELDS.map((key) => fieldState(doc, key)).filter((v) => v.state !== "skip");
}

/** The recommended fields still open, neither stated nor waived. */
export function openFields(doc: ProjectDoc): FieldView[] {
  return fieldViews(doc).filter((v) => v.state === "missing");
}

/** What a reader sees for a field, the value or its state in words. */
export function fieldText(doc: ProjectDoc, key: WaivableField): string {
  return fieldState(doc, key).text;
}

/** The update_project field that states each recommended field, for the agent. */
export const FIELD_PATCH_PATH: Record<WaivableField, string> = {
  subsectors: "subsectors",
  sectorOther: "sectorOther",
  contracts: "architecture.contracts as rows of name and why, or architecture.contractsNone true",
  externalDeps: "architecture.externalDeps, or architecture.externalDepsNone true",
  oracles: "architecture.oracleUse none or uses, with architecture.oracles",
  adminFunctions: "architecture.adminFunctions",
  upgradeability: "architecture.upgradeability",
  worstCase: "worstCase",
  audit: "security.audit",
  bugBounty: "security.bugBounty",
  monitoring: "security.monitoring",
  incidentResponse: "security.incidentResponse",
  keyCustody: "security.keyCustody",
  firstHundredUsers: "firstHundredUsers",
};

/** One line per open field for an agent: the label, the key and how to state or waive it. */
export function openFieldLines(doc: ProjectDoc): string[] {
  return openFields(doc).map((f) => `- ${f.label} (${f.key}). State it with update_project ${FIELD_PATCH_PATH[f.key]}, or send waived.${f.key} with a short reason when it does not apply.`);
}
