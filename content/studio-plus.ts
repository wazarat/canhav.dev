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
  /** The one sentence a free account sees in the editor (M136), on the Overview. */
  oneLine: "Studio+ adds the business model, brand kit, analytics, alerts and the investor pack.",
  oneLineLink: "See what it includes",
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
    /** A project whose team is not on the plan (M134), the 403 and the MCP answer. */
    project: "This project's team is not on Studio+. Upgrade from the studio, or move the project to a team that is.",
    /** The agent sent Studio+ fields for a project whose team is not on the plan. */
    fields: (fields: readonly string[]) =>
      `${fields.join(", ")} ${fields.length === 1 ? "is" : "are"} part of Studio+. This project's team is not on the plan, so nothing was changed.`,
    /** A Studio+ account on a personal project. */
    personal: "This project is personal, so Studio+ does not reach it here. Move it to your team to use Studio+ on it.",
    /** A Studio+ account on a project whose team lapsed. */
    lapsed: "This project's team is not on Studio+ any more. These surfaces open again when the plan is active.",
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
  /** The investor pack (M126, a prompt since M159). */
  pack: {
    title: "Investor pack",
    intro: "Your agent or any AI builds the one pager and the deck from the full record and your brand kit. Nothing here is published.",
    parts: { onepager: "One pager", deck: "Deck", grants: "Grant answers", onepagerFile: "One pager file", deckFile: "Deck file" } as const,
    none: "Nothing built yet.",
    have: (parts: string[], date: string) => `${parts.join(", ")} · last change ${date}`,
    draftOnepager: "Draft the one pager",
    draftDeck: "Draft the deck",
    /** The menu's copy item names the prompt's length (M159). */
    copyPrompt: (chars: number) => `Copy the prompt, ${chars.toLocaleString("en-US")} characters`,
    copyPromptHint: "Paste it into any AI with the full record and the brand kit",
    builtAt: (date: string, file: string) => `Built by your agent on ${date}, at ${file}`,
    recordedAt: (file: string) => `Recorded at ${file}`,
    removeFile: "Forget the file",
    earlier: "Earlier draft, written in the studio before the pack became a prompt",
    earlierGrants: "Earlier grant answers, no longer drafted",
    filesOnly: (parts: string[]) => `The pack's ${parts.join(", ")} ${parts.length === 1 ? "is" : "are"} no longer written through update_project. Build the file from the draft_pack prompt and record where it lives with investorPack.files.`,
    prompt: {
      opening: (kind: "onepager" | "deck", name: string) =>
        `Build the investor ${kind === "onepager" ? "one pager" : "deck"} for ${name}. Everything below is the project's record from CanHav Studio. Use only these facts and the repository you can see; where the record is silent, write what you assume in square brackets.`,
      noBrand: "No brand kit is set yet. Use a plain, legible style and say so.",
      noLogo: "No logo is uploaded yet.",
      banners: "The social banners (X, Open Graph, square) download from the Brand tab of the studio; ask the team for them if the deck needs one.",
      noToken: "No token is launched or linked yet.",
      onepager: "A one pager, one page, in this order. The problem. The product. Who pays and why. Where it stands (what is built, on which chain, what is recorded). The market and the one or two names it is compared with. The ask. Short paragraphs, one or two facts each.",
      deck: (slides: { min: number; max: number }) =>
        `A deck of 8 to ${slides.max} slides, each a title and its content. The order a reviewer expects, title with the tagline, the problem, the product, how it works, who pays, where it stands, market and competition, the plan, the team, the ask. One fact per line.`,
      rules: [
        "Apply the brand kit, the palette's primary and accent for emphasis, the surface colour for backgrounds, the display font for titles and the body font for text, the tone words for the voice, the tagline on the first page or slide, the logo where a mark belongs.",
        "Numbers only from the record and the repository. Mark anything assumed in square brackets.",
        "Never mention CanHav as the author, the team is the author.",
      ],
      closing: (kind: "onepager" | "deck", alias: string) =>
        `When the file exists, record where it lives on the project with the ${alias} MCP server, update_project investorPack.files.${kind} set to the path in the repository or its URL. If you have no MCP connection, tell the team the path and they record it in the studio.`,
    },
    download: "Download",
    print: "Print the one pager",
    remove: "Remove",
    slides: (n: number) => `${n} ${n === 1 ? "slide" : "slides"}`,
    answers: (n: number, program: string) => `${n} ${n === 1 ? "answer" : "answers"} for ${program}`,
    words: (n: number) => `${n} words`,
    backToModel: "Back to Business model",
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
    mapHint: "The largest protocols and the pinned ones. TVL on a log scale, age in years since DefiLlama listed them. Hover or focus a dot for the full name, click it to pin it.",
    axisX: "Across",
    axisY: "Up",
    axes: { tvl: "TVL", age: "Age" },
    you: "You",
    /** The project has no TVL yet (M156), so it is a marker at its age or a note, never a dot at zero. */
    youLater: (name: string) => `${name} appears here once it has TVL.`,
    hovered: (name: string, tvl: string, listed: string) => `${name}, TVL ${tvl}, listed ${listed}`,
    hoveredPinned: "pinned",
    hoverEmpty: "Hover or focus a dot to read it.",
    differentiator: "How you differ",
    differentiatorHint: "One line a reviewer remembers. Drafted from the record against the landscape.",
    draft: "Draft the line",
    pinned: (n: number) => (n === 1 ? "1 pinned" : `${n} pinned`),
  },
  /** The Value Proposition Canvas per profile (M157, F16). */
  valueCanvas: {
    title: "Value proposition",
    intro: "One canvas per ideal customer profile. The value map on the left says what the product does, the customer profile on the right what that customer needs, and each pain reliever or gain creator can name the pain or gain it answers.",
    forProfile: (name: string) => `For ${name}`,
    profile: (n: number) => `Profile ${n}`,
    noProfiles: "Write an ideal customer profile first. A value proposition is always for a specific customer.",
    valueMap: "Value map",
    customerProfile: "Customer profile",
    areas: {
      products: { label: "Products and services", hint: "What the product is made of, for this customer." },
      painRelievers: { label: "Pain relievers", hint: "How it removes or reduces a pain on the right." },
      gainCreators: { label: "Gain creators", hint: "How it produces a gain on the right." },
      jobs: { label: "Customer jobs", hint: "What this customer is trying to get done." },
      pains: { label: "Pains", hint: "What gets in the way, the risks and the costs." },
      gains: { label: "Gains", hint: "What they want to get out of it." },
    },
    answers: "Answers",
    answersNone: "Nothing to answer yet, add a pain or a gain first.",
    unansweredPains: (n: number) => (n === 1 ? "1 pain has no reliever yet." : `${n} pains have no reliever yet.`),
    unansweredGains: (n: number) => (n === 1 ? "1 gain has no creator yet." : `${n} gains have no creator yet.`),
    allAnswered: "Every pain and gain has an answer.",
    seed: "Start from the profile",
    seedHint: "Puts the profile's objection under pains and its buying trigger under gains.",
    draft: "Draft the canvas",
    differLine: "How you differ",
    differEdit: "Edit under Competitors",
  },
  /** Prospects (M158, F14), the real people to contact. */
  prospects: {
    title: "People to contact",
    intro: "Real people who fit a profile. Private to your team, never published, exported or sent to a model; your agent reads and adds them only on a signed in session.",
    count: (n: number, contacted: number) => `${n === 1 ? "1 person" : `${n} people`}, ${contacted} contacted`,
    columns: { name: "Name", contact: "Contact", contacted: "Contacted", date: "Date", profile: "Profile" },
    add: "Add a person",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Remove",
    yes: "Yes",
    no: "No",
    noProfile: "No profile",
    placeholders: { name: "Name", email: "Email", linkedin: "LinkedIn URL or handle", x: "X URL or handle" },
    empty: "Nobody yet. Add the people your profiles describe, or let your agent add them as it works through outreach.",
    limit: (max: number) => `At most ${max} people per project.`,
    failed: "Could not save. Check the contact details and try again.",
    sessionOnly: "Prospects are private to the team and are read or written only on a signed in session, not on a project key.",
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
    intro: "The classic nine block canvas, each block a few short items. Drafted from what the record already says about the product, the personas and who pays, then yours to edit block by block. Accelerators and grants ask for it.",
    filled: (n: number) => `${n} of 9 blocks filled`,
    draft: "Draft the canvas",
    redraft: "Redraft",
    /** The block cards (M155). */
    add: "Add",
    edit: "Edit",
    addItem: "Add an item",
    done: "Done",
    remove: "Remove",
    empty: "Nothing here yet.",
    itemPlaceholder: "One idea, in a few words",
    count: (n: number, max: number) => `${n} of ${max} items`,
    keys: "Enter adds the next item, Escape closes.",
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
    /** One Draft control per section (M141): a primary button and a menu with the three ways. */
    menu: {
      agent: "Draft with your agent",
      agentHint: "Queued on the project, written on its next call",
      canhav: "Draft with CanHav",
      copy: "Copy the prompt",
      copied: "Copied",
      copyHint: "For an editor without the MCP server connected",
      open: "More ways to draft",
    },
    queuedSince: (when: string) => `Queued for your agent since ${when}`,
    cancel: "Cancel",
    draftedBy: { agent: (when: string) => `Drafted by your agent on ${when}`, canhav: (when: string) => `Drafted by CanHav on ${when}` },
    /** What is sent, for the docs and the first use note. */
    sends: "Drafting sends the project record, the kit summary and the fields named for the draft to Anthropic's API from CanHav's side. Nothing from your repository and no keys.",
  },
  /** The brief before a draft (M142): a few questions, each answered in one or two sentences. */
  brief: {
    title: "Before the draft",
    lead: "A sentence or two per question. The draft builds on your answers instead of assuming them, and they stay on the project for your agent.",
    draft: "Draft",
    skip: "Skip, draft anyway",
    saved: (date: string) => `Brief from ${date}`,
    edit: "Edit the brief",
    questions: {
      whoPays: { label: "Who pays?", hint: "The person or team whose budget this comes out of." },
      whoUses: { label: "Who uses it day to day?", hint: "The role that opens it, when that is not the payer." },
      whereToday: { label: "Where are they today?", hint: "The protocol, spreadsheet or desk that does this job for them now." },
      switchTrigger: { label: "What makes them switch?", hint: "The moment or number that moves them." },
      objection: { label: "What is their main objection?", hint: "What they say before they say no." },
      revenue: { label: "How does the product earn?", hint: "Fees, spread, subscriptions, who pays what and when." },
      channels: { label: "How do customers find it?", hint: "The channels you will actually work, not every channel." },
      partners: { label: "Which partners does it lean on?", hint: "Protocols, providers and people the product cannot run without." },
      cost: { label: "What is the biggest cost?", hint: "The line that dominates, and whether it is fixed." },
      comparedWith: { label: "Who will you be compared with?", hint: "The one or two names a reviewer brings up first." },
      differenceKind: { label: "What kind of difference is it?", hint: "Product, users, chain, price or trust, pick the one that holds." },
      toneWords: { label: "Which words describe the tone?", hint: "Two to five, such as plain, precise, warm." },
      avoidLook: { label: "Which look do you want to avoid?", hint: "A style, a colour or a competitor's feel." },
      feel: { label: "How should it feel to use?", hint: "The impression after the first minute." },
      ask: { label: "What is the ask?", hint: "The amount, the round or the grant size, and what it buys." },
      traction: { label: "What traction is real today?", hint: "Users, volume, partners or pilots the record can back." },
      team: { label: "Who is on the team?", hint: "Names, roles and the one thing each has shipped." },
      budget: { label: "How would the budget be spent?", hint: "The three or four lines a programme expects to see." },
      jobs: { label: "What is this customer trying to get done?", hint: "The job in their words, not the product's." },
      biggestPain: { label: "What is their biggest pain today?", hint: "The cost, risk or friction that hurts most." },
      gainWanted: { label: "What gain would make them switch?", hint: "The outcome they would pay for." },
      landed: { label: "What landed this period?", hint: "Commits, deployments, decisions." },
      next: { label: "What is next?", hint: "The one or two things the team starts on now." },
      blocked: { label: "What is blocked?", hint: "One honest line, or none." },
    },
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
      teaser: "The classic nine block canvas on the Business model tab, each block a few short items, drafted from the pitch, the personas and who pays, then edited by you.",
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
      teaser: "Unlimited private projects with share links. Free keeps one.",
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
      teaser: "A GitHub Action runs Slither or Aderyn and asks Sourcify about your deployed addresses, and the result sits beside the review pass as proof.",
    },
    monitoring: {
      title: "Monitoring and alerts",
      teaser: "One switch watches every contract and token you record for ownership changes, pauses, large transfers and curve graduation, sends to email, Telegram or Discord within a minute, and a test alert proves it before anything happens on chain.",
    },
    analytics: {
      title: "Holder and volume analytics",
      teaser: "Holders, traders, daily volume and new wallets over 90 days. The curve itself is on every token page.",
    },
    investor_pack: {
      title: "Investor pack",
      teaser: "One prompt with the full record and the brand kit, for your agent or any AI to build the one pager and the deck.",
    },
    weekly_update: {
      title: "Team update",
      teaser: "A short post for the public page, drafted from the period's activity by your agent or by CanHav, published when you click Publish.",
    },
    tester_kit: {
      title: "Tester kit",
      teaser: "An invite link that shows testers the faucet link, your testnet contracts and your steps, and collects a rating and a note per step.",
    },
    custom_domain: {
      title: "Custom domain",
      teaser: "The public page on your own domain, keeping the CanHav record link as the credibility signal.",
    },
    version_history: {
      title: "Version history",
      teaser: "Draft version history with restore, for when an agent or a teammate overwrites something. Published snapshots are free for everyone.",
    },
  } satisfies Record<PlusFeature, { title: string; teaser: string }>,
} as const;

/**
 * The features that have shipped. Everything else on the pricing page
 * carries the Soon badge. Grows with the run.
 */
export const STUDIO_PLUS_SHIPPED: readonly PlusFeature[] = ["private_projects", "version_history", "project_keys", "bmc", "icp", "competitors", "brand", "github_sync", "checks", "analytics", "monitoring", "weekly_update", "tester_kit", "investor_pack", "custom_domain"];
