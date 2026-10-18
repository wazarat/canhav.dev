import type { Milestone } from "@/lib/build-milestones";
import type { ProblemTab } from "@/lib/build-readiness";

/**
 * Copy for the BUILD project page (M93 onwards). Five fixed tabs, four
 * build milestones, the agent status line and the drawer. Code may say
 * BUILD; product copy says Studio. No em dashes, no colons before a space.
 */
export const BUILD_TABS = ["overview", "build", "decisions", "deployments", "publish"] as const;

export type BuildTab = (typeof BUILD_TABS)[number];

export const BUILD_COPY = {
  kicker: "Studio",
  tabs: {
    overview: "Overview",
    build: "Build",
    decisions: "Decisions",
    deployments: "Deployments",
    publish: "Publish",
  } satisfies Record<BuildTab, string>,
  /** The one line under the header that says where the agent stands. */
  agent: {
    connect: "Connect agent",
    connected: "Agent connected",
    working: "Agent working",
    waiting: "Waiting on you",
  },
  milestones: {
    design: {
      label: "Design",
      blurb: "Decide what you are building and how the pieces fit together.",
    },
    testnet: {
      label: "Testnet",
      blurb: "Put it on the testnet and walk through the scenarios that matter.",
    },
    review: {
      label: "Review",
      blurb: "Settle the security declarations and run the review passes.",
    },
    launch: {
      label: "Launch",
      blurb: "Record the deployments, link the token and publish the project.",
    },
  } satisfies Record<Milestone, { label: string; blurb: string }>,
  status: {
    todo: "Todo",
    done: "Done",
    partial: "Partial",
    na: "Not applicable",
    appliesAgain: "Applies again",
    reasonPrompt: "Why does this step not apply here?",
    reasonPlaceholder: "A sentence the agent and reviewers can read.",
    reasonSave: "Save",
    reasonCancel: "Cancel",
  },
  filters: {
    now: "Now",
    all: "All steps",
    everyShape: "Every shape",
    everyMilestone: "Every milestone",
    empty: "Nothing is open. Every step is done or marked not applicable.",
    emptyFiltered: "No steps match these filters.",
  },
  row: {
    using: "Using",
    notUsing: "Not using",
    undo: "Undo",
    read: (n: number) => (n === 1 ? "Read 1" : `Read ${n}`),
    more: (n: number) => `+${n} more`,
    evidencePlaceholder: "Evidence, a file, a test name, an address or a commit",
    yourStep: "Your step",
    remove: "Remove",
    restore: "Restore",
    removed: (n: number) => (n === 1 ? "1 removed step" : `${n} removed steps`),
    sharedWith: (labels: readonly string[]) => `Also part of ${labels.join(", ")}`,
    addStep: "Add a step",
    addStepTitle: "What has to be true",
    addStepDetail: "What done looks like, optional",
    addStepShape: "Shape",
    add: "Add",
  },
  /** The derived rows under the Launch milestone, each opening its tab. */
  launchRows: {
    testnet: {
      title: "Deploy on the testnet",
      detail: "Record every deployed contract under Deployments.",
      tab: "deployments",
    },
    token: {
      title: "Link the token",
      detail: "Launch from the linked design or link a token you launched.",
      tab: "deployments",
    },
    publish: {
      title: "Publish the project",
      detail: "Fill what is left under Decisions and Publish, then publish from the header.",
      tab: "publish",
    },
  } satisfies Record<string, { title: string; detail: string; tab: BuildTab }>,
  resources: {
    line: (n: number) =>
      n === 1 ? "Your agent has 1 core resource." : `Your agent has ${n} core resources.`,
    read: "Read",
    drawerTitle: "Resource pack",
    drawerClose: "Close",
    saving: "Saving",
    saved: "Saved",
    /** The sidebar group and the drawer sections (2026-10-18). */
    groupTitle: "Resources",
    groupHint: "Optional reading. Your agent gets all of it over MCP and picks what it needs.",
    optional: "Reading this is optional. Your agent receives every section over MCP and chooses what to use; tick and untick here to shape what it is given.",
    views: {
      pack: "Resource pack",
      templates: "Contract templates",
      environment: "Where protocols run",
    },
    templatesNone: "No contract template fits the chosen shapes yet.",
  },
  overview: {
    progress: (done: number, total: number) => `Build ${done} of ${total}`,
    noShape: "Pick what you are building under Decisions to get build steps.",
  },
  decisions: {
    title: "Decisions",
    building: "What you are building",
    chain: "Chain",
    templates: "Templates",
    templatesEmpty: "No template decided yet. Decide them from the Build tab or let your agent.",
    contracts: "Contracts",
    dependencies: "External dependencies",
    oracles: "Oracles",
    admin: "Admin functions",
    upgradeability: "Upgradeability",
    worstCase: "Worst case",
    security: "Security declarations",
    files: "Project files",
    agentNote: (when: string) => `Agent note, ${when}`,
  },
  deployments: {
    title: "Deployments",
    testnet: "Testnet",
    tokens: "Tokens",
    tokensEmpty: "No token is linked to this project yet.",
    mainnet: "Mainnet",
    explorer: "Explorer",
    tokenPage: "Token page",
  },
  publish: {
    title: "Publish",
    record: "The public record",
    readiness: "Ready to publish",
    readinessLine: "Everything checks out. Publish from the button above.",
    notReady: "Not ready to publish yet.",
    openIn: (tab: string) => `Open ${tab}`,
    handoff: "Hand off to your agent",
  },
  /** The dot on a tab and the readiness row name the tab that holds the open fields. */
  tabProblems: {
    decisions: "Decisions has open fields",
    publish: "Publish has open fields",
  } satisfies Record<ProblemTab, string>,
  sidebar: {
    publicPage: "Public page",
  },
  classic: {
    placeholder: "This tab is on its way.",
    link: "Open the classic editor",
  },
} as const;
