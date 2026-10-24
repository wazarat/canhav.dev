import { GRANT_PROGRAMS } from "@/content/grants";
import type { ProjectDoc } from "@/lib/ideation";

/** The pack as three markdown files (M126): ONEPAGER.md, DECK.md (one ## per slide) and GRANTS.md. Pure. */

export function buildOnepagerMd(doc: ProjectDoc): string {
  const p = doc.investorPack;
  const lines = [`# ${doc.name || "Project"}`, ""];
  if (p?.onepager) lines.push(p.onepager.trim(), "");
  else lines.push("No one pager drafted yet. Draft it from the Business model tab of the studio or ask your agent for update_project investorPack.onepager.", "");
  if (doc.website) lines.push(`Website: ${doc.website}`); // copy-ok, export line
  if (doc.githubRepo) lines.push(`Repository: https://github.com/${doc.githubRepo}`); // copy-ok, export line
  return lines.join("\n").trimEnd() + "\n";
}

export function buildDeckMd(doc: ProjectDoc): string {
  const p = doc.investorPack;
  const lines = [`# ${doc.name || "Project"}, the deck`, ""];
  if (p?.deck?.length) {
    for (const s of p.deck) {
      lines.push(`## ${s.title}`, "");
      for (const b of s.bullets) lines.push(`- ${b}`);
      lines.push("");
    }
  } else lines.push("No deck drafted yet. Draft it from the Business model tab of the studio or ask your agent for update_project investorPack.deck.", "");
  return lines.join("\n").trimEnd() + "\n";
}

export function buildGrantsMd(doc: ProjectDoc): string {
  const p = doc.investorPack;
  const lines = [`# ${doc.name || "Project"}, grant answers`, "", "Draft answers to the recurring questions of three programme styles. Check every number and every claim before a form takes them.", ""];
  let any = false;
  for (const prog of GRANT_PROGRAMS) {
    const answers = p?.grants?.[prog.id];
    if (!answers) continue;
    any = true;
    lines.push(`## ${prog.name}`, "", prog.url, "");
    for (const q of prog.questions) {
      if (!answers[q.id]) continue;
      lines.push(`### ${q.label} (${q.words} words)`, "", answers[q.id], "");
    }
  }
  if (!any) lines.push("No grant answers drafted yet. Draft them from the Business model tab of the studio or ask your agent for update_project investorPack.grants.", "");
  return lines.join("\n").trimEnd() + "\n";
}
