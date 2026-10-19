/**
 * Partner perks and priority help (M119, Studio+). Content only. A perk
 * carries a referral link or code once a deal is signed; until then the
 * row says to ask, and the contact form carries the request. No colons
 * before whitespace and no em dashes in any string (npm run check:copy).
 */
export interface Perk {
  partner: string;
  what: string;
  blurb: string;
  url: string;
  /** The referral link or code once agreed, null while pending. */
  referralUrl: string | null;
  code: string | null;
}

export const PERKS: readonly Perk[] = [
  {
    partner: "Cyfrin",
    what: "Audits and competitive audits",
    blurb: "Scoped from the record and the review passes, so the first call is about the code, not the pitch.",
    url: "https://www.cyfrin.io",
    referralUrl: null,
    code: null,
  },
  {
    partner: "Sumsub",
    what: "KYC and KYB",
    blurb: "For a sale that needs verified buyers, or a team that needs verified founders.",
    url: "https://sumsub.com",
    referralUrl: null,
    code: null,
  },
  {
    partner: "Tenderly",
    what: "Simulation and monitoring",
    blurb: "Virtual testnets and alerting that the checks workflow links to on every run.",
    url: "https://tenderly.co",
    referralUrl: null,
    code: null,
  },
  {
    partner: "Alchemy",
    what: "RPC and node infrastructure",
    blurb: "A paid RPC for the indexer and the alerts worker once public endpoints start rate limiting.",
    url: "https://www.alchemy.com",
    referralUrl: null,
    code: null,
  },
];

export const PERKS_COPY = {
  title: "Partner perks",
  lead: "Discounts on the work around a launch through partners CanHav already routes to, the way a launchpad routes KYC and audits through approved partners. Each row says what is agreed.",
  pending: "Referral terms pending. Ask and we route the introduction.",
  agreed: "Referral agreed",
  code: (code: string) => `Code ${code}`,
  open: "Open",
  ask: "Ask about a perk",
} as const;

export const HELP_COPY = {
  title: "Priority help",
  lead: "A monthly office hour and faster replies, founder led at first. Studio+ teams book the hour from here; everyone else reaches us through the contact form.",
  book: "Book the office hour",
  reply: "Replies within one working day for Studio+ teams.",
} as const;
