/**
 * The new project flow at /studio/new (M91). Four steps, one required
 * field. No colons before whitespace and no em dashes (check:copy scans
 * this file).
 */
export const NEW_PROJECT_COPY = {
  kicker: "Studio",
  title: "Start a project",
  lead: "Four short steps. Only the name is needed now, the rest can wait for the editor.",
  /** Under the body on every step. */
  editableLater: "Everything here can be changed later, at any point while you ideate and build.",
  cancel: "Cancel",
  steps: {
    name: "Name",
    sector: "Sector",
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
  chain: {
    whatItDoesLabel: "Short description of your project",
    whatItDoesHint: "One line is enough here. The full description comes later in the editor.",
    whatItDoesPlaceholder: "A vault that lends idle treasury into fixed rate markets.",
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
