/**
 * Copy for the waitlist form, modal and page. Accounts open in approved
 * batches (Clerk access mode "Waitlist"); the form stores the lead in
 * launchpad.leads and mirrors the email into Clerk's waitlist for one-click
 * approval. No em dashes, no colons.
 */
export const WAITLIST_COPY = {
  kicker: "Early access",
  title: "Join the waitlist",
  lead: "CanHav accounts open in approved batches. Tell us who you are and what you want to launch, and we will send an invitation when your spot is ready.",
  modalIntro:
    "Accounts open in approved batches. Leave your details and we will send an invitation when your spot is ready.",
  fields: {
    name: "Name",
    email: "Email",
    leadType: "Are you an individual or a team?",
    comments: "What do you want to launch?",
    commentsHint: "optional",
    commentsPlaceholder: "A token, a project, or just curious. A line or two is plenty.",
  },
  submit: "Join waitlist",
  submitting: "Joining…",
  privacy: "No spam. We only use this to send your invitation.",
  successTitle: "You're on the list",
  successBody:
    "We approve accounts in batches. Watch your inbox for a confirmation now and the invitation when your spot is ready.",
  errorSuffix: "Your details are still here, try again.",
  signInPrompt: "No account yet?",
  navButton: "Join waitlist",
  navButtonShort: "Waitlist",
} as const;
