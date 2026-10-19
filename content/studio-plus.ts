import type { PlusFeature, StudioPlan } from "@/lib/plan-shared";

/**
 * Copy for Studio+ (M106), the paid tier of the studio. The plan word is
 * the product name, Studio or Studio+, and it reads Studio+ everywhere in
 * the studio for an account on the plan. No colons before whitespace and
 * no em dashes in any string (npm run check:copy).
 */
export const STUDIO_PLUS_COPY = {
  name: "Studio+",
  free: "Studio",
  /** The plan word for a kicker, a title or the nav. */
  planName: (plan: StudioPlan) => (plan === "studio_plus" ? "Studio+" : "Studio"),
  path: "/studio/plus",
  upgrade: "Upgrade to Studio+",
  manage: "Manage team",
  /** The pill on every gated surface. */
  pill: "Studio+",
  gate: {
    /** Above the teaser on a gated surface. */
    title: "Part of Studio+",
    teaser: (feature: PlusFeature) => STUDIO_PLUS_COPY.features[feature].teaser,
    /** The 403 an API route answers. */
    api: "This needs Studio+. Upgrade from the studio.",
    /** The MCP tool answer for a free account. */
    mcp: "This tool needs Studio+. The project owner can upgrade at canhav.com/studio/plus.",
    /** After checkout, before the session token has caught up. */
    refresh: "Just upgraded? Reload once and the page catches up.",
  },
  /** The pricing page (M108). */
  page: {
    kicker: "Studio+",
    title: "Your team, the whole record, and the work the record implies",
    lead: "Studio+ adds the business model, the ideal customers, the competitor map, the brand kit and the operations around a launch to the studio, for a team of three and more.",
    firstWave: "Your features",
    moreWave: "More features",
    seats: "Seats",
    seatsLead: "Three seats come with the plan. Add people from the Team page as you need them.",
    /** When the session is signed out. */
    signIn: "Sign in to upgrade. The plan belongs to a team, so you will make one first.",
    /** When the session has no team active. */
    noTeam: "Studio+ belongs to a team. Make one here, or pick an existing team from the account menu, then come back to this page.",
    /** When the session's team already pays. */
    onPlan: "This team is on Studio+.",
    pickYearly: "Yearly billing saves 25 percent.",
    plans: "Plans",
    checkoutNote: "Checkout opens in this page. Card payments in USD through Clerk and Stripe. Cancel any time from the Team page; the plan runs to the end of the paid period.",
    manage: "Manage team",
    toStudio: "Back to the studio",
  },
  /** After checkout (M108). */
  welcome: {
    kicker: "Studio+",
    title: "Welcome to Studio+",
    lead: "The plan is on your team. Your personal projects stay yours until you move them; a moved project, its token design and its launches open for every member.",
    chip: "Studio+ is active",
    moveTitle: "Move projects to the team",
    moveNone: "No personal projects to move.",
    moveSelected: (n: number) => (n === 1 ? "Move 1 project" : `Move ${n} projects`),
    moving: "Moving",
    moved: (n: number) => (n === 1 ? "1 project moved." : `${n} projects moved.`),
    moveFailed: "Some projects could not be moved. Reload and try again.",
    invite: "Invite your team",
    inviteLead: "Add people from the Team page. Three seats are included; more are added as you invite.",
    team: "Open the Team page",
    studio: "Go to the studio",
    /** The token may lag the webhook by a moment. */
    refresh: "If the studio still reads Studio, reload once.",
  },
  /** Brand identity kit (M118). */
  /** The investor and grant pack on Publish (M126). */
  pack: {
    title: "Investor and grant pack",
    intro: "A one pager, a short deck and draft grant answers, written from the record, the canvas, the profiles and the competitor line. Drafted by your agent or by CanHav, edited by you, exported as markdown. Never published.",
    parts: { onepager: "One pager", deck: "Deck", grants: "Grant answers" } as const,
    none: "Nothing drafted yet.",
    have: (parts: string[], date: string) => `${parts.join(", ")} drafted · last change ${date}`,
    draftOnepager: "Draft the one pager",
    draftDeck: "Draft the deck",
    draftGrants: "Draft the answers",
    programLabel: "Programme",
    download: "Download",
    print: "Print the one pager",
    remove: "Remove",
    slides: (n: number) => `${n} ${n === 1 ? "slide" : "slides"}`,
    answers: (n: number, program: string) => `${n} ${n === 1 ? "answer" : "answers"} for ${program}`,
    words: (n: number) => `${n} words`,
    backToPublish: "Back to Publish",
    printHint: "Print this page to PDF from your browser.",
    noOnepager: "No one pager drafted yet.",
    printFooter: "Made with CanHav Studio+",
  },
  brand: {
    title: "Brand",
    intro: "Name, ticker, logo, palette, fonts, tone and social banners as one kit. The agent reads it in AGENTS.md and brand.json, and the public page uses the palette. No designer before launch, and a token page that looks like every clone.",
    palette: "Palette",
    swatches: { primary: "Primary", secondary: "Secondary", accent: "Accent", surface: "Surface" },
    pick: "Pick from the logo",
    picking: "Reading the logo",
    pickHint: "Reads the dominant colours of the logo uploaded on Publish (png or jpeg).",
    found: "Colours found in the logo. Click one to use it as the primary.",
    fonts: "Fonts",
    display: "Display",
    body: "Body",
    tone: "Tone words",
    toneHint: "Two to five, comma separated.",
    tagline: "Tagline",
    draft: "Draft the kit",
    contrast: (what: string, ratio: string) => `${what} reads at ${ratio} to 1 on the surface. Below 4.5 is hard to read.`,
    banners: "Banners",
    bannersHint: "SVG downloads from the kit. The share image of the public page uses the palette too.",
    banner: { x: "X header", og: "Link card", square: "Avatar" },
    file: "brand.json",
    fileHint: "The kit as one file on the project export, for the agent and for any site you build.",
    none: "No kit yet. Draft one, pick colours from the logo, or fill it by hand.",
  },
  /** Competitor landscape (M115). */
  competitors: {
    title: "Competitors",
    intro: "The protocols in your subsector on your chain, from DefiLlama, refreshed monthly, and where you sit among them. Hours of research, and finding out after launch that three teams built the same thing.",
    loading: "Loading the landscape",
    failed: "Could not load the landscape. Reload and try again.",
    none: "No category on DefiLlama maps to this project's subsectors yet. Pick a subsector under What you are building.",
    onChain: (chain: string) => `On ${chain}`,
    anyChain: "Any chain, too few on yours",
    month: (month: string) => `Snapshot ${month}`,
    categories: (list: string) => `DefiLlama ${list}`,
    kit: (list: string) => `In your kit ${list}`,
    table: { name: "Protocol", category: "Category", tvl: "TVL", chains: "Chains", listed: "Listed", pin: "Pin" },
    mapTitle: "Positioning map",
    mapHint: "The largest protocols and the pinned ones. TVL on a log scale, age in months since DefiLlama listed them. You are the bright dot, at the age of this project and no TVL yet.",
    axisX: "Across",
    axisY: "Up",
    axes: { tvl: "TVL", age: "Age" },
    you: "You",
    differentiator: "How you differ",
    differentiatorHint: "One line a reviewer remembers. Drafted from the record against the landscape.",
    draft: "Draft the line",
    pinned: (n: number) => (n === 1 ? "1 pinned" : `${n} pinned`),
  },
  /** Ideal customer profiles (M114). */
  icp: {
    title: "Ideal customers",
    intro: "One or two ideal customer profiles with the wallets, channels and protocols they use, built on the persona table and on the protocols in your subsector on DefiLlama. Testers who are not the target user give useless feedback.",
    draft: "Draft the profiles",
    add: "Add a profile",
    remove: (n: number) => `Remove profile ${n}`,
    profile: (n: number) => `Profile ${n}`,
    hintsOn: "Onchain hints from the protocols in your subsector are part of the draft.",
    hintsOff: "Onchain wallet counts need a Dune query. The draft uses the record and DefiLlama's protocol list.",
    fields: {
      name: { label: "Name", placeholder: "Treasury lead at a mid size fund" },
      summary: { label: "Who they are", placeholder: "One paragraph." },
      walletsTheyUse: { label: "Wallets they use", placeholder: "Safe, Rabby, Ledger" },
      channels: { label: "Channels", placeholder: "Telegram groups, X, conferences" },
      protocolsTheyUse: { label: "Protocols they use", placeholder: "Aave, Morpho, Pendle" },
      buyingTrigger: { label: "Buying trigger", placeholder: "What makes them move now." },
      objection: { label: "Objection", placeholder: "What stops them." },
    },
    listHint: "Comma separated.",
  },
  /** The Business Model Canvas (M113). */
  canvas: {
    title: "Business model",
    intro: "Nine blocks, drafted from what the record already says about the product, the personas and who pays, then yours to edit. Accelerators and grants ask for it.",
    filled: (n: number) => `${n} of 9 blocks filled`,
    draft: "Draft the canvas",
    redraft: "Redraft",
    blocks: {
      customerSegments: { label: "Customer segments", hint: "Who the product is for, in order of priority." },
      valueProposition: { label: "Value proposition", hint: "What they get that they cannot get elsewhere." },
      channels: { label: "Channels", hint: "How they find and reach the product." },
      customerRelationships: { label: "Customer relationships", hint: "How the team keeps them, from onboarding to support." },
      revenueStreams: { label: "Revenue streams", hint: "What is paid, by whom, and when." },
      keyResources: { label: "Key resources", hint: "What the product cannot run without." },
      keyActivities: { label: "Key activities", hint: "What the team does every week to deliver it." },
      keyPartners: { label: "Key partners", hint: "Protocols, providers and people the product leans on." },
      costStructure: { label: "Cost structure", hint: "The big costs and which are fixed." },
    },
  },
  /** Server side drafting (M112). */
  draft: {
    draft: "Draft",
    redraft: "Redraft",
    working: "Drafting",
    remaining: (n: number) => (n === 1 ? "1 draft left this month" : `${n} drafts left this month`),
    capReached: "Your team has used its 60 drafts for this month. Your own agent can write the same fields over MCP, or wait for the first of the month.",
    failed: "The draft failed. Try again.",
    /** Agent-first (M117). */
    queue: "Ask your agent",
    queued: (when: string) => `Waiting for your agent since ${when}. It picks this up on its next call.`,
    cancel: "Cancel",
    serverNow: "Draft with CanHav now",
    serverFirst: "No agent is connected to this project, so CanHav drafts it; connect one to draft without the allowance.",
    by: { agent: (when: string) => `Drafted by your agent, ${when}`, canhav: (when: string) => `Drafted by CanHav, ${when}` },
    askAgent: "Or ask your agent",
    askAgentLabel: "Paste into your IDE",
    askAgentHint: "Your agent writes the same fields through update_project, outside the monthly allowance.",
    askAgentHintTool: (tool: string) => `Your agent writes it with ${tool}, outside the monthly allowance.`,
    /** What is sent, for the docs and the first use note. */
    sends: "Drafting sends the project record, the kit summary and the fields named for the draft to Anthropic's API from CanHav's side. Nothing from your repository and no keys.",
  },
  /** Project keys (M111). */
  keys: {
    readOnly: "This key has read scope. Writes need a write key; the owner makes one on the project page under Deployments.",
  },
  pricing: {
    monthly: 39.99,
    yearlyMonthly: 29.99,
    seatsIncluded: 3,
    extraSeat: 9.99,
    seatLimit: 5,
    monthlyLine: "$39.99 a month",
    yearlyLine: "$29.99 a month billed yearly",
    seatsLine: "3 seats included, each additional seat $9.99 a month",
  },
  features: {
    bmc: {
      title: "Business Model Canvas",
      teaser: "A nine block canvas on the Business model tab, drafted from the pitch, the personas and who pays, then edited by you.",
    },
    icp: {
      title: "ICP",
      teaser: "One or two ideal customer profiles with the wallets and channels they use, built on the persona table and onchain hints.",
    },
    competitors: {
      title: "Competitor landscape",
      teaser: "A live table and positioning map for the same subsector and chain, refreshed monthly, with one line on how you differ.",
    },
    brand: {
      title: "Brand identity",
      teaser: "Name, ticker, logo, palette, fonts and social banners as one kit that the agent and the public page both use.",
    },
    private_projects: {
      title: "Private projects",
      teaser: "Stealth mode before announcing. Free gets public projects plus one private.",
    },
    project_keys: {
      title: "Secret keys",
      teaser: "Project keys with read or write scope, so cloud agents and CI work without a browser sign in.",
    },
    github_sync: {
      title: "GitHub sync",
      teaser: "Fills Deployments from broadcast files and ticks steps from commits and PRs, so no retyping addresses.",
    },
    checks: {
      title: "Automated checks",
      teaser: "A GitHub Action runs Slither or Aderyn, Sourcify verification and Tenderly links, so Review becomes proof.",
    },
    monitoring: {
      title: "Monitoring and alerts",
      teaser: "Ownership changes, pauses, large transfers and curve graduation on your contracts, sent by email, Telegram or Discord within a minute.",
    },
    analytics: {
      title: "Token analytics",
      teaser: "Holders, curve progress, volume and wallet growth over 90 days.",
    },
    investor_pack: {
      title: "Investor and grant pack",
      teaser: "A one pager, a short deck and draft grant answers generated from the record, canvas, ICP and competitors.",
    },
    weekly_update: {
      title: "Weekly update",
      teaser: "The agent drafts a status post from the activity feed, the team approves it, and it posts to the public page.",
    },
    tester_kit: {
      title: "Tester kit",
      teaser: "An invite link gives testers the faucet and collects feedback per step.",
    },
    custom_domain: {
      title: "Custom domain",
      teaser: "The public page on your own domain, keeping the CanHav record link as the credibility signal.",
    },
    version_history: {
      title: "Version history",
      teaser: "Restore earlier drafts and decisions after an agent or teammate overwrites something.",
    },
  } satisfies Record<PlusFeature, { title: string; teaser: string }>,
} as const;

/**
 * The features that have shipped. Everything else on the pricing page
 * carries the Soon badge. Grows with the run.
 */
export const STUDIO_PLUS_SHIPPED: readonly PlusFeature[] = ["private_projects", "version_history", "project_keys", "bmc", "icp", "competitors", "brand", "github_sync", "checks", "analytics", "monitoring", "weekly_update", "tester_kit", "investor_pack", "custom_domain"];
