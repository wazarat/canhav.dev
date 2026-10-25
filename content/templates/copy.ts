import type { StatusTone } from "@/components/ui/StatusChip";
import type {
  AuditStatus,
  ChainDeployment,
  LicenseClass,
  TemplateAvailability,
  TemplateComplexity,
  TemplateKind,
} from "@/lib/templates";

/**
 * Copy for contract templates (M61). "Contract templates" in prose, since
 * "Template" alone already names CanHav's own markdown files in the resource
 * pack (KIND_LABELS.template). No em dashes, no colons.
 */

export const TEMPLATE_KIND_LABELS: Record<TemplateKind, string> = {
  integrate: "Integrate",
  fork: "Fork and deploy",
  factory: "Create via factory",
  library: "Library",
};

export const LICENSE_CLASS_LABELS: Record<LicenseClass, string> = {
  permissive: "Permissive license",
  copyleft: "Copyleft license",
  restricted: "Restricted license",
};

export const AUDIT_LABELS: Record<AuditStatus, string> = {
  yes: "Audited",
  partial: "Partly audited",
  no: "Not audited",
  unknown: "Audit unknown",
};

export const COMPLEXITY_LABELS: Record<TemplateComplexity, string> = {
  low: "Low complexity",
  medium: "Medium complexity",
  high: "High complexity",
};

/** Chain status pill, tone per the StatusChip rules. */
export const CHAIN_DEPLOYMENT_COPY: Record<ChainDeployment, { label: (chain: string) => string; tone: StatusTone }> = {
  deployed: { label: (chain) => `On ${chain}`, tone: "success" },
  unknown: { label: (chain) => `Unknown on ${chain}`, tone: "warning" },
  not_deployed: { label: (chain) => `Not on ${chain}`, tone: "error" },
};

export const AVAILABILITY_COPY: Record<TemplateAvailability, { label: string; tone: StatusTone; detail: string }> = {
  ready: { label: "Ready", tone: "success", detail: "Deployed on this mainnet. Integrate it or create from its factory." },
  self_deploy: { label: "Self-deploy", tone: "info", detail: "A library or a fork template. You deploy it yourself on any chain." },
  unknown: { label: "Unverified", tone: "warning", detail: "No evidence either way on this mainnet. Confirm on the explorer before building on it." },
  unavailable: { label: "Not on this chain", tone: "neutral", detail: "The protocol publishes deployments and this mainnet is not among them. Background reading here." },
};

export const TEMPLATE_COPY = {
  kicker: "Studio",
  title: "Contract templates",
  lede: "Credible open-source templates and live protocols a builder can fork, deploy from a factory, or integrate. Every entry shows its license, audit history and whether it is live on each chain.",
  generated: (date: string) => `Research preview, not an audit or legal advice, as of ${date}. Confirm addresses on the explorer and read the license file in the repo before building.`,
  count: (n: number) => `${n} ${n === 1 ? "template" : "templates"}`,
  none: "No template matches these filters.",
  restrictedNote: "A restricted license is read and integrated, never forked.",
  inactiveNote: "The protocol wound down. Reference design only.",
  ponsFit: "Pons fit",
  readingLabels: "Reading the labels",
  legend: [
    "Live means an official address list, explorer record or announcement confirms a deployment on that chain. Self-deploy marks a library or fork template with no canonical deployment, which you deploy yourself. Not live means the protocol publishes deployments and that chain is not among them. Unverified means no evidence either way was found.",
    "Permissive licenses (MIT, Apache, BSD, ISC) allow closed commercial forks. Copyleft (GPL, LGPL, AGPL) allows forks if you share your changes under the same license. Restricted covers active BUSL periods, proprietary code and non-commercial terms, so integrate with the deployed contracts instead of forking.",
    "Pons fit flags templates that can sit behind a Pons creator-fee address or work with the launched token. Pons pays creator fees in the pairing asset, such as ETH, USDG or a stock token, and the creator holds no token allocation.",
  ],
  filters: {
    title: "Filters",
    search: "Search",
    searchPlaceholder: "Morpho, ERC-4626, staking",
    sector: "Sector",
    subsector: "Subsector",
    chain: "Chain",
    anyChain: "Any chain",
    liveOn: (chain: string) => `Live on ${chain}`,
    license: "License",
    anyLicense: "Any license",
    kind: "How you use it",
    anyKind: "Any way",
    pons: "Pairs with a Pons launch",
    inactive: "Show inactive protocols",
    clear: "Clear all filters",
    apply: "Apply",
  },
  links: { repo: "Repository", docs: "Docs" },
  chipNote: (live: number, total: number, chain: string) =>
    live ? `${live} of ${total} templates run on ${chain}` : `No template in this list runs on ${chain} yet`,
  /** Under a product a subsector picked on its own, when no template is live on the project's mainnet. */
  noneOnChainNote: (chain: string) => `No template for this runs on ${chain} yet`,
  noneOnChainDetail: (chain: string) =>
    `None of the contract templates in the catalog for this product is deployed on ${chain} yet. You still get every build step for it, so your agent can work through them over MCP and you have a guideline to build against while a template lands.`,
  noneOnChainAria: "Why there is no template yet",
  gapsTitle: "Template gaps on this chain",
  /** The way forward when templates run on the other mainnet, under the detail. */
  noneOnChainPlan: (live: number, otherMainnet: string, mainnet: string, otherTestnet: string) =>
    live
      ? `${live === 1 ? "One template" : `${live} templates`} for this ${live === 1 ? "runs" : "run"} on ${otherMainnet}. Accept ${live === 1 ? "it" : "them"} and iterate for ${mainnet}, or move the project to ${otherTestnet} and build there.`
      : `No template for this runs on ${otherMainnet} either. Build from the steps and the kit files.`,
  /** Decisions on a project's build steps (M63). */
  stepTitle: "Contract templates",
  stepHint: "Candidates for this step. Accept what you will build on or integrate, reject what you will not, and the choice travels with the project into RESOURCES.md and the MCP tools.",
  summary: (c: { accepted: number; rejected: number; open: number }) =>
    `${c.accepted} accepted, ${c.rejected} rejected, ${c.open} undecided`,
  accept: "Accept",
  reject: "Reject",
  undo: "Undo",
  state: { accepted: "Accepted", rejected: "Rejected", open: "Undecided" } as const,
  stateTone: { accepted: "success", rejected: "neutral", open: "info" } as const,
  railTitle: "Accepted templates",
  railCount: (n: number) => `${n} accepted`,
  railNone: "No template accepted yet. Each build step lists its candidates.",
  browse: "Browse the full catalog",
  envTitle: (chain: string) => `Templates on ${chain}`,
  envIntro: "Where each accepted template stands on the mainnet this project is heading for. Confirm every address on the explorer before building on it.",
  exportIntro: (c: { accepted: number; rejected: number; open: number; total: number }) =>
    `${c.total} candidates for the project's product modules, ${c.accepted} accepted, ${c.rejected} rejected, ${c.open} undecided. Accepted means the team will build on or integrate it, rejected means do not propose it again, undecided means the team has not chosen yet.`,
} as const;
