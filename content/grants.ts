import type { ProjectChain } from "@/lib/chains";

/**
 * Grant programmes the investor pack drafts answers for (M126, Studio+).
 * Each carries the questions a form of that style asks and the word
 * limit the drafts respect. Programmes change their forms; these are the
 * recurring questions, named by style so an answer transfers.
 */
export interface GrantQuestion {
  id: string;
  label: string;
  /** The word limit the draft keeps to. */
  words: number;
}

export interface GrantProgram {
  id: string;
  name: string;
  blurb: string;
  url: string;
  questions: GrantQuestion[];
}

export const GRANT_PROGRAMS: readonly GrantProgram[] = [
  {
    id: "arbitrum",
    name: "Arbitrum Foundation grants",
    blurb: "Ecosystem grants for teams building on Arbitrum chains, milestone based.",
    url: "https://arbitrum.foundation/grants",
    questions: [
      { id: "summary", label: "Project summary", words: 150 },
      { id: "problem", label: "The problem and who has it", words: 200 },
      { id: "arbitrum", label: "Why Arbitrum and how it benefits the ecosystem", words: 200 },
      { id: "milestones", label: "Milestones and what each delivers", words: 250 },
      { id: "team", label: "Team and track record", words: 150 },
      { id: "budget", label: "Budget and how it is spent", words: 150 },
    ],
  },
  {
    id: "gitcoin",
    name: "Gitcoin round",
    blurb: "Public goods rounds funded by quadratic matching; a short public profile.",
    url: "https://grants.gitcoin.co",
    questions: [
      { id: "description", label: "Project description", words: 200 },
      { id: "publicGood", label: "Why this is a public good", words: 150 },
      { id: "progress", label: "Progress so far", words: 150 },
      { id: "funds", label: "How funds will be used", words: 120 },
    ],
  },
  {
    id: "general",
    name: "General builder grant",
    blurb: "The recurring questions of builder and retro grant forms, impact, metrics, plan and risks, the shape many programmes share.",
    url: "https://app.optimism.io/retropgf",
    questions: [
      { id: "impact", label: "Impact on the ecosystem", words: 200 },
      { id: "metrics", label: "Metrics that show it", words: 150 },
      { id: "plan", label: "What the grant changes", words: 200 },
      { id: "risks", label: "Risks and how they are handled", words: 150 },
    ],
  },
];

/** Programme ids from before M143, read as the programme that replaced them. */
export const GRANT_PROGRAM_ALIASES: Record<string, string> = { optimism: "general" };

export function grantProgramId(id: string): string {
  return GRANT_PROGRAM_ALIASES[id] ?? id;
}

export function grantProgram(id: string): GrantProgram | null {
  const real = grantProgramId(id);
  return GRANT_PROGRAMS.find((p) => p.id === real) ?? null;
}

/** The programmes in the order the project's chain suggests (M143): the chain's own first where it has one. */
export function grantProgramsFor(chain: ProjectChain): GrantProgram[] {
  const order = chain === "arbitrum_sepolia" ? ["arbitrum", "gitcoin", "general"] : ["general", "gitcoin", "arbitrum"];
  return order.map((id) => GRANT_PROGRAMS.find((p) => p.id === id)).filter((p): p is GrantProgram => Boolean(p));
}

/** One line under the programme picker where the chain has no programme of its own. */
export const GRANT_CHAIN_NOTE: Partial<Record<ProjectChain, string>> = {
  robinhood_testnet: "Robinhood Chain has no public grant programme today, so the general form stands in.",
};
