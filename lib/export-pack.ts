import type { ProjectDoc } from "@/lib/ideation";

/** The pack's text parts written before M159 as markdown (M126): ONEPAGER.md and DECK.md (one ## per slide). Pure. */

export function buildOnepagerMd(doc: ProjectDoc): string {
  const p = doc.investorPack;
  const lines = [`# ${doc.name || "Project"}`, ""];
  if (p?.onepager) lines.push(p.onepager.trim(), "");
  else lines.push("No one pager text is stored. Since M159 the one pager is built by your agent or any AI from the pack prompt on the Business model tab, and the record keeps where the file lives.", "");
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
  } else lines.push("No deck text is stored. Since M159 the deck is built by your agent or any AI from the pack prompt on the Business model tab, and the record keeps where the file lives.", "");
  return lines.join("\n").trimEnd() + "\n";
}
