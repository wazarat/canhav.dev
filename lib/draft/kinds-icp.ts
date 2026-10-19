import "server-only";

import { AUDIENCE_OPTIONS, optionLabel } from "@/content/ideation";
import { chainInfo, projectChainOf } from "@/lib/chains";
import { categoriesFor, fetchLlamaProtocols, formatTvl, pickProtocols } from "@/lib/competitors/llama";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import { fetchDuneQueryRows } from "@/lib/dune";
import { type Icp, icpDraftSchema } from "@/lib/icp";
import { type ProjectDoc, docAudience, filledConsumerPersonas, filledPersonas } from "@/lib/ideation";

/** The persona table as the model reads it. */
function personaExtras(doc: ProjectDoc): string {
  const lines = ["## Personas"]; // copy-ok, model context
  lines.push(`Audience: ${optionLabel(AUDIENCE_OPTIONS, docAudience(doc))}.`); // copy-ok, model context
  for (const p of filledPersonas(doc)) lines.push(`Business persona: team of ${p.teamSize || "?"}, ${p.geography || "?"}, ${p.industry || "?"}, contact ${p.primaryContact || "?"}, revenue ${p.revenueRange || "?"}.`); // copy-ok, model context
  for (const p of filledConsumerPersonas(doc)) lines.push(`Consumer persona: age ${p.ageRange || "?"}, ${p.geography || "?"}, ${p.cryptoExperience || "?"}, found via ${p.howTheyFindYou || "?"}, holds ${p.holdings || "?"}.`); // copy-ok, model context
  if (doc.whoPays) lines.push(`Who pays: ${doc.whoPays}`); // copy-ok, model context
  if (doc.firstHundredUsers) lines.push(`First hundred users: ${doc.firstHundredUsers}`); // copy-ok, model context
  return lines.join("\n");
}

/** The protocols in the subsector, and the optional Dune wallet counts. */
async function onchainExtras(doc: ProjectDoc): Promise<string[]> {
  const out: string[] = [];
  const chain = projectChainOf(doc);
  const categories = categoriesFor(doc.subsectors ?? []);
  if (categories.length) {
    const all = await fetchLlamaProtocols();
    const { rows, onChain } = pickProtocols(all, categories, chain, 10);
    if (rows.length) {
      out.push(
        [
          `## Protocols in ${categories.join(", ")}${onChain ? ` on ${chainInfo(chain).name}` : ", any chain"} (DefiLlama)`, // copy-ok, model context
          ...rows.map((p) => `${p.name}, TVL ${formatTvl(p.tvl)}, chains ${p.chains.slice(0, 4).join(", ")}`),
        ].join("\n"),
      );
    }
  }
  const queryId = Number(process.env[`DUNE_ICP_QUERY_ID_${chainInfo(chain).chainId}`] ?? "");
  if (Number.isInteger(queryId) && queryId > 0) {
    try {
      const rows = await fetchDuneQueryRows(queryId, 24);
      if (rows.length) out.push(`## Active wallets of similar protocols (Dune)\n${rows.map((r) => JSON.stringify(r)).join("\n")}`); // copy-ok, model context
    } catch (err) {
      console.warn("[draft] dune hint skipped", err);
    }
  }
  return out;
}

function fixture(doc: ProjectDoc): { profiles: Icp[] } {
  return {
    profiles: [
      {
        name: `Early adopter of ${doc.name || "the product"}`,
        summary: "A fixture profile. No model key is set locally, so this stands in for the drafted text.",
        walletsTheyUse: ["Rabby", "Safe"],
        channels: ["Telegram", "X"],
        protocolsTheyUse: ["Aave", "Morpho"],
        buyingTrigger: "A yield they can explain to their own stakeholders.",
        objection: "Unaudited contracts.",
      },
    ],
  };
}

registerDraftKind("icp", {
  schema: icpDraftSchema,
  extras: async (doc) => [personaExtras(doc), ...(await onchainExtras(doc))],
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite one or two ideal customer profiles for this project. Each has a short name (a role, not a person), a one paragraph summary, the wallets they use, the channels where they can be reached, the protocols they already use (prefer the ones listed from DefiLlama when they fit), the trigger that makes them act now, and the objection they will raise. Lists hold up to eight short items. Build on the personas; if the record and the protocol list disagree, say so in the summary.`,
  ask: () => "Draft the ideal customer profiles.",
  fixture: (doc) => fixture(doc),
});
