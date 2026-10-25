/**
 * The new project flow at /studio/new (M91, five steps since M130). One
 * required field. No colons before whitespace and no em dashes (check:copy scans
 * this file).
 */
export const NEW_PROJECT_COPY = {
  kicker: "Studio",
  title: "Start a project",
  lead: "Five short steps. Only the name is needed now, the rest can wait for the editor or your agent.",
  /** Under the body on every step. */
  editableLater: "Everything here can be changed later, at any point while you ideate and build.",
  cancel: "Cancel",
  steps: {
    name: "Name",
    sector: "Sector",
    building: "Building",
    chain: "Chain",
    finish: "Logo and token",
  },
  name: {
    label: "Project name",
    placeholder: "What is this called?",
    hint: "You can rename it at any time.",
    problem: "Name is too short",
  },
  sector: {
    label: "Which sector is it in?",
    hint: "Pick one. You can add more later in the editor.",
    undecidedTitle: "I have not decided yet",
    undecidedSentence: "I want to start with a name and pick a sector later.",
    selected: "Chosen",
  },
  /** The building step (M130): the description, the subsector and the shape, so Build has steps on day one. */
  building: {
    whatItDoesLabel: "What are you building?",
    whatItDoesHint: "One line is enough here. The full description comes later, or your agent writes it from this over MCP.",
    whatItDoesPlaceholder: "A vault that lends idle treasury into fixed rate markets.",
    subsectorHint: "Pick what fits. Each subsector brings its own build steps and research, and the chosen module fills the Build tab from day one.",
    agentHint: "No sector yet, so the subsector and module wait. Your agent can classify the project from the description over MCP, or pick them under Decisions.",
  },
  chain: {
    /** Robinhood testnet is picked from the start (M148); the project stores what is picked. */
    hint: "Where the project builds and tests, and where a token launched from it goes. Robinhood testnet is picked for you; change it here if you build on Arbitrum Sepolia.",
  },
  finish: {
    uploadsOff: "Logo upload is not set up on this deployment. Add a logo later from the editor.",
    tokenLabel: "Do you want a native token?",
    tokenHint: "Yes starts a token design named after the project and links it. You can rename it or unlink it later. No and Not sure start nothing; a design can be added from the project page at any time.",
    tokenYes: "Yes",
    tokenNo: "No",
    tokenUnsure: "Not sure",
  },
  actions: {
    back: "Back",
    next: "Continue",
    create: "Create project",
    creating: "Creating",
    open: "Open the project",
  },
  errors: {
    failed: "The project could not be created. Try again.",
    designSkipped: "The project was created but its token design was not. Start one from the project page.",
  },
} as const;
