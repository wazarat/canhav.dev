import "server-only";

import { chainInfo } from "@/lib/chains";
import { landscapeFor } from "@/lib/competitors/landscape";
import { formatTvl } from "@/lib/competitors/llama";
import { COMPETITOR_LIMITS, ageMonths, competitorsDraftSchema } from "@/lib/competitors/record";
import { DRAFT_VOICE } from "@/lib/draft/context";
import { registerDraftKind } from "@/lib/draft/kinds";
import { cutAtWord } from "@/lib/text";
import type { ProjectDoc } from "@/lib/ideation";
import { itemTexts } from "@/lib/canvas-items";
import { VALUE_AREAS } from "@/lib/value-canvas";

registerDraftKind("competitors", {
  schema: competitorsDraftSchema,
  clean: (value) => ({ differentiator: cutAtWord(value.differentiator.trim(), COMPETITOR_LIMITS.differentiator.max) }),
  extras: async (doc: ProjectDoc) => {
    const l = await landscapeFor(doc);
    if (!l.rows.length) return [];
    const head = `## The landscape, ${l.categories.join(", ")}${l.onChain ? ` on ${chainInfo(l.chain).name}` : ", any chain"} (DefiLlama, snapshot ${l.month})`; // copy-ok, model context
    const rows = l.rows.slice(0, 15).map((r) => {
      const age = ageMonths(r.listedAt);
      return `${r.name} (${r.category}), TVL ${formatTvl(r.tvl)}, chains ${r.chains.slice(0, 4).join(", ")}${age !== null ? `, listed ${age} months ago` : ""}`;
    });
    const kit = l.kitFamilies.length ? `Families the project's research kit already names: ${l.kitFamilies.join(", ")}.` : ""; // copy-ok, model context
    // The value canvas (M157) says what the product does for whom, the ground the line is drafted from.
    const vc = Object.entries(doc.valueCanvas ?? {}).flatMap(([key, c]) =>
      c ? [`Value proposition canvas, profile ${Number(key) + 1}: ${VALUE_AREAS.filter((a) => c[a].length).map((a) => `${a} ${itemTexts(c[a]).join("; ")}`).join(". ")}`] : [], // copy-ok, model context
    );
    return [[head, ...rows, kit, ...vc].filter(Boolean).join("\n")];
  },
  instructions: () =>
    `${DRAFT_VOICE}\n\nWrite one line, at most 300 characters, on how this project differs from the protocols in the landscape. Name the one or two it will be compared with and the difference a reviewer would remember, in terms of product, users or chain, not in terms of hope. No hype words.`,
  ask: () => "Draft the differentiator line.",
  fixture: (doc) => ({ differentiator: `${doc.name || "This project"} differs from the largest protocols in its category by serving one narrower user with a simpler product. (Fixture, no model key is set locally.)` }),
});
