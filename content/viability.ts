import type { AssetRole } from "@/lib/assets";

/** "A", "A and B", "A, B and C". */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Copy for the Viability tab (M162 onwards, Studio+). Five sections, each
 * opening with one plain sentence that answers its question, then the
 * detail. States and facts are plain text (M137), every outside number
 * carries its source and read date. No em dashes, no colons before a
 * space.
 */
export const VIABILITY_COPY = {
  lead: "Whether this idea can work on its chain, answered from the record, current chain data and a fixed method. Each answer carries its source and the date it was read, and your agent can read and fill every section.",
  /** The summary card on top, one sentence per section with data, each a link to its section. */
  summary: {
    title: "Where it stands",
    empty: "Nothing checked yet. Each section below adds one sentence here once it has data.",
    jump: "Open the section",
  },
  sections: {
    dependencies: {
      title: "Can it be built here",
      question: "Does everything this idea depends on exist on the project's chain today, and if not, what is the workaround?",
      empty: "The check reads the protocols your modules rely on, the templates you accepted, the external dependencies on Decisions and the assets below, then says for each one whether it is available, mainnet only, a workaround or missing.",
    },
    gaps: {
      title: "What is live on this chain",
      question: "Which subsectors already have live protocols on this chain, and where is nobody yet?",
      empty: "A map of the six sectors and their subsectors with the protocols live on the chain today, from DefiLlama and CanHav's own records, your subsectors outlined.",
    },
    economics: {
      title: "Do the numbers work",
      question: "At what TVL or volume does this cover its costs, and how sensitive is that?",
      empty: "A unit economics model for your product's family with low, base and high scenarios, the break even point and a chart of revenue against cost.",
    },
    experiments: {
      title: "Experiments",
      question: "What is the smallest test that proves or kills the riskiest assumption, and what happened when it ran?",
      empty: "Experiments turn canvas assumptions into validated or invalidated items on the public page. Each one names the assumption, the test, the pass bar and the kill criterion, and keeps its evidence.",
    },
  },
  /** The assets the idea depends on (M162), the base of the dependency check. */
  assets: {
    title: "Assets",
    lead: "The tokens this idea touches, collateral, what is borrowed, the quote asset, the underlying or a reward. Your agent fills them from the code; the check reads a price feed and onchain liquidity for each.",
    symbol: "Symbol",
    symbolPlaceholder: "USDG",
    role: "Role",
    rolePlaceholder: "Pick a role",
    roles: {
      collateral: "Collateral",
      borrow: "Borrowed",
      quote: "Quote asset",
      underlying: "Underlying",
      reward: "Reward",
    } satisfies Record<AssetRole, string>,
    address: "Address",
    addressHint: "Optional. The token's address on the chain the project builds on, or on its mainnet.",
    addressPlaceholder: "0x…",
    add: "Add an asset",
    edit: "Edit",
    done: "Done",
    remove: (symbol: string) => `Remove ${symbol || "this asset"}`,
    limit: (max: number) => `At most ${max} assets.`,
    empty: "No assets yet.",
    /** Who filled a row (M137 plain text). */
    filledBy: {
      agent: (date: string) => `Filled by your agent${date ? `, ${date}` : ""}`,
      owner: (date: string) => `Added by you${date ? `, ${date}` : ""}`,
    },
    /** The M141 style control. */
    send: "Ask your agent",
    queue: "Queue it for your agent",
    copyPrompt: "Copy the prompt",
    queuedSince: (time: string) => `Asked your agent to fill the assets, ${time}`,
    cancel: "Cancel",
    capReached: "Ten requests are already queued for your agent. Cancel one or let it work through them first.",
  },
  /** The dependency check (M163). States are words at the start of a row, never a chip. */
  dependencies: {
    groups: { protocols: "Protocols", assets: "Assets", chain: "Chain" },
    states: {
      available: "Available",
      mainnet_only: "Mainnet only",
      workaround: "Workaround",
      missing: "Missing",
      unknown: "Unknown",
    },
    /** The sentence on top. */
    summary: (available: number, total: number, chain: string) =>
      total === 0 ? `Nothing to check yet on ${chain}. Pick a product module and add the assets.` : `${available} of ${total} dependencies ${available === 1 ? "is" : "are"} available on ${chain}.`,
    missingLine: (names: readonly string[]) => (names.length === 1 ? `${names[0]} is missing.` : `${names.join(", ")} are missing.`),
    workaroundLine: (n: number) => (n === 1 ? "One needs a workaround." : `${n} need a workaround.`),
    mainnetOnlyLine: (n: number) => (n === 1 ? "One runs on the mainnet only." : `${n} run on the mainnet only.`),
    /** Protocol rows. */
    protocol: {
      official: (testnet: string) => `official deployment on ${testnet}.`,
      community: (testnet: string) => `community deployment on ${testnet}, not in the official registry.`,
      mainnetOnly: (mainnet: string, testnet: string) => `runs on ${mainnet} and has no ${testnet} deployment.`,
      missing: (mainnet: string, testnet: string) => `no deployment on ${mainnet} or ${testnet}.`,
      noRow: "no deployment recorded on either network.",
      stepCommunity: (name: string) => `Use the community ${name} deployment on the testnet, or deploy your own`,
      stepMainnetOnly: (name: string, testnet: string) => `Deploy or mock ${name} on ${testnet}`,
      stepMissing: (name: string) => `Decide the workaround for ${name}`,
      stepDetail: "From the dependency check on the Viability tab.",
    },
    /** Accepted template rows. */
    template: {
      ready: (mainnet: string) => `deployed on ${mainnet}; the catalog has no testnet address.`,
      selfDeploy: (testnet: string) => `a fork or a library, so your agent deploys it on ${testnet}.`,
      unavailable: (mainnet: string) => `the protocol publishes its deployments and ${mainnet} is not among them.`,
      unknown: (mainnet: string) => `the catalog has no record of it on ${mainnet}.`,
      stepReady: (name: string, testnet: string) => `Point ${name} at a ${testnet} deployment or mock it`,
      stepSelfDeploy: (name: string, testnet: string) => `Deploy ${name} on ${testnet}`,
      stepUnavailable: (name: string) => `Decide the workaround for ${name}`,
    },
    external: "declared by the team on Decisions, not checked here.",
    /** Asset rows, the oracle part then the liquidity part. */
    asset: {
      feedTestnet: (pair: string, testnet: string) => `Chainlink ${pair} feed on ${testnet}.`,
      feedMainnetWithMock: (pair: string, mainnet: string, label: string, testnet: string) => `Chainlink ${pair} feed on ${mainnet}; your recorded ${label} stands in on ${testnet}.`,
      feedMainnetOnly: (pair: string, mainnet: string, testnet: string) => `Chainlink ${pair} feed on ${mainnet} and none on ${testnet}.`,
      noFeedWithMock: (mainnet: string, label: string) => `no Chainlink feed on ${mainnet}; your recorded ${label} stands in.`,
      noFeed: (mainnet: string, testnet: string) => `no Chainlink feed on ${mainnet} or ${testnet}.`,
      liquidity: (usd: string, pools: number, mainnet: string) => `Liquidity ${usd} in ${pools} ${pools === 1 ? "pool" : "pools"} on ${mainnet}`,
      noLiquidity: (mainnet: string) => `No pool on ${mainnet} holds it`,
      liquidityNotRead: "Liquidity not read yet",
      stepMock: (symbol: string, testnet: string) => `Deploy a mock price feed for ${symbol} on ${testnet}`,
      stepDetail: "From the dependency check on the Viability tab. Point the contracts at the mock on the testnet and at the Chainlink proxy on the mainnet.",
    },
    /** Chain rows. */
    chain: {
      equityFeeds: (n: number, mainnet: string) => `${n} tokenized equity price feeds on ${mainnet}.`,
      noEquityFeeds: (mainnet: string) => `no tokenized equity price feeds on ${mainnet}.`,
      equityTitle: "Stock token feeds",
      faucetTitle: "Testnet faucet",
      faucet: (testnet: string) => `faucet for ${testnet}.`,
      faucetBeta: (testnet: string) => `the ${testnet} faucet wants mainnet ETH on the address first, so you may fund the key from a wallet you already have.`,
      networkTitle: (testnet: string) => testnet,
      network: (note: string) => (note ? note.charAt(0).toLowerCase() + note.slice(1) : note),
    },
    /** Sources and actions. */
    source: (label: string, date: string) => (date ? `${label}, read ${date}` : label),
    checkedAgo: (ago: string) => `Checked ${ago}`,
    justNow: "just now",
    checkAgain: "Check again",
    checking: "Checking",
    failed: "The check could not run. Try again in a moment.",
    addStep: "Add as a step",
    addedStep: (milestone: string) => `Added under ${milestone}`,
    stepsFull: "The forty added steps are used. Remove one on Build first.",
    noShape: "Pick a product module under Decisions and the protocols it relies on appear here.",
    noAssets: "Add the assets above and each one gets its price feed and liquidity here.",
  },
  /** The gap map (M165). Counts are words and numbers in text, shading is the ink scale, never a chip. */
  gaps: {
    chainLabel: "Chain",
    chains: { robinhood_testnet: "Robinhood Chain", arbitrum_sepolia: "Arbitrum One" },
    /** The text equivalent above the matrix. */
    sentence: (live: number, total: number, chain: string, open: readonly string[]) =>
      open.length === 0
        ? `Every one of the ${total} subsectors has live protocols on ${chain}.`
        : `${live} of ${total} subsectors have live protocols on ${chain}; ${joinNames(open)} ${open.length === 1 ? "has" : "have"} none.`,
    /** The summary card's line for the project. */
    yoursOpen: (names: readonly string[], chain: string) => `${joinNames(names)} ${names.length === 1 ? "has" : "have"} no live protocol on ${chain}.`,
    yoursLive: (chain: string) => `Every subsector you build in has live protocols on ${chain}.`,
    yoursNone: (open: readonly string[], chain: string) => (open.length ? `${joinNames(open)} ${open.length === 1 ? "has" : "have"} no live protocol on ${chain}.` : `Every subsector has live protocols on ${chain}.`),
    count: (n: number) => (n === 1 ? "1 live" : `${n} live`),
    none: "No live protocol yet",
    yours: "You build here",
    openLine: (names: readonly string[]) => (names.length === 0 ? "No subsector is open; every one has live protocols." : `Open, with nobody there yet, ${joinNames(names)}.`),
    source: (month: string, date: string) => `DefiLlama snapshot of ${month} and CanHav records, read ${date}`,
    noSnapshot: "The monthly snapshot has not run yet. The map fills once it does.",
    loading: "Reading the chain",
    failed: "The map could not load. Try again in a moment.",
    details: (label: string, n: number, chain: string) => (n === 0 ? `${label}, no live protocol on ${chain} yet.` : `${label}, ${n === 1 ? "1 protocol" : `${n} protocols`} live on ${chain}.`),
    sources: { llama: "DefiLlama", canhav: "on CanHav", template: "template" },
    close: "Close",
    /** The compact lines in the wizard. */
    compactSector: (n: number, chain: string) => (n === 0 ? `No live protocol on ${chain} yet` : `${n} live on ${chain}`),
    compactOpen: (names: readonly string[]) => `${joinNames(names)} open`,
  },
  /** Experiments (M170, M171). Statuses and verdicts are words, never a chip. */
  experiments: {
    statuses: { planned: "Planned", running: "Running", passed: "Passed", failed: "Failed", stopped: "Stopped" },
    verdicts: { validated: "validated", invalidated: "invalidated" },
    noDeadline: "No deadline",
    due: (date: string, days: number) => `Due ${date}, in ${days} ${days === 1 ? "day" : "days"}`,
    dueToday: (date: string) => `Due ${date}, today`,
    overdue: (date: string, days: number) => `Was due ${date}, ${days} ${days === 1 ? "day" : "days"} ago`,
    /** The summary card line. */
    summary: (running: number, overdue: number, next: string | null) =>
      running === 0
        ? "No experiment is running."
        : overdue
          ? `${running === 1 ? "One experiment is" : `${running} experiments are`} running and ${overdue === 1 ? (running === 1 ? "it is" : "one is") : `${overdue} are`} past the deadline${next ? ` (${next.charAt(0).toLowerCase()}${next.slice(1)})` : ""}.`
          : `${running === 1 ? "One experiment is" : `${running} experiments are`} running${next ? `, ${next.charAt(0).toLowerCase()}${next.slice(1)}` : ""}.`,
    /** The agent may not set a verdict. */
    verdictByPerson: "Only a person sets an experiment to passed or failed, from the project page. Propose the verdict in result and leave the status.",
    /** The public page section. */
    publicTitle: "Experiments",
    publicLead: "Tests the team ran against its own assumptions, with what happened. A validated or invalidated item on the canvases links to its experiment here.",
    publicLine: (status: string, hypothesis: string) => `${status}. ${hypothesis}`,
    publicResult: "Result",
    /** The section on the Viability tab (M171). */
    empty: "No experiment yet. Pick an item on a canvas and press Test this, or start one from a template below.",
    new: "New experiment",
    blank: "Blank",
    templateLabel: "Start from",
    assumption: "Assumption",
    assumptionHint: "The canvas or value canvas item this tests, or write it down.",
    assumptionText: "Written assumption",
    assumptionPick: "Pick an item",
    assumptionFree: "Not an item, I will write it",
    hypothesis: "Hypothesis",
    hypothesisPlaceholder: "Stock token holders will deposit USDG into a curated vault",
    test: "The test",
    testPlaceholder: "One vault with mock collateral on the testnet, ten testers through the tester kit, each asked to deposit and withdraw",
    metric: "What is measured",
    metricPlaceholder: "Testers who complete a deposit and a withdrawal",
    passBar: "Pass when",
    passBarPlaceholder: "8 of 10 testers complete both",
    killCriterion: "Kill when",
    killCriterionPlaceholder: "Fewer than 3 complete both",
    deadline: "Deadline",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    remove: "Remove",
    start: "Start",
    startWithInvite: "Start with a tester invite",
    inviteHint: "Makes a tester kit invite with the test as its steps and attaches it. Tester ratings and notes appear as evidence.",
    inviteLine: (done: number, max: number) => `${done} of ${max} testers done`,
    inviteLink: "Open the invite",
    stop: "Stop",
    setPassed: "Set passed",
    setFailed: "Set failed",
    verdictConfirm: (verdict: string) => `Mark it ${verdict} and write the result in one paragraph. The linked item reads ${verdict === "passed" ? "validated" : "invalidated"} on the public page.`,
    result: "Result",
    resultPlaceholder: "What happened, in one paragraph.",
    confirm: "Confirm",
    evidence: "Evidence",
    evidenceNone: "No evidence yet.",
    addEvidence: "Add evidence",
    evidenceText: "What you saw",
    evidenceUrl: "Link, optional",
    evidenceBy: { team: "the team", agent: "your agent" },
    evidenceLine: (by: string, date: string) => `${by}, ${date}`,
    testerEvidence: (step: number, rating: number, note: string) => `Tester rated step ${step} ${rating} of 5${note ? `, ${note}` : ""}`,
    onchain: "Attach onchain evidence",
    onchainNone: "No alert event or analytics for the linked token yet.",
    onchainEvent: (kind: string, line: string) => `${kind}, ${line}`,
    onchainTotals: (holders: number, trades: number) => `Linked token, ${holders} holders and ${trades} trades in the last 7 days`,
    finishedLine: (status: string, hypothesis: string, date: string) => `${status} ${date}. ${hypothesis}`,
    showFinished: (n: number) => (n === 1 ? "1 finished experiment" : `${n} finished experiments`),
    capReached: "Twenty experiments is the most. Remove a finished one first.",
    testThis: "Test this",
    filledBy: { team: (date: string) => `Added by your team, ${date}`, agent: (date: string) => `Proposed by your agent, ${date}` },
  },
  /** A source and the date it was read, after any outside number. */
  readAt: (source: string, date: string) => `${source}, read ${date}`,
} as const;
