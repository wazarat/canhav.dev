import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { StatusChip } from "@/components/ui/StatusChip";
import { ALL_SUBSECTOR_OPTIONS, SECTOR_OPTIONS } from "@/content/ideation";
import {
  AUDIT_LABELS,
  CHAIN_DEPLOYMENT_COPY,
  COMPLEXITY_LABELS,
  LICENSE_CLASS_LABELS,
  TEMPLATE_COPY as T,
  TEMPLATE_KIND_LABELS,
} from "@/content/templates/copy";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import { sectorOfSubsector } from "@/lib/sectors";
import { type ContractTemplate, templateOnChain } from "@/lib/templates";
import { cn } from "@/lib/utils";

/**
 * One contract template (M61). Name links to the repo, badges name the
 * kind, license class, audit status and complexity (categories, so Badge),
 * one StatusChip per chain says whether it is live on that mainnet (the
 * only coloured element), then the description, the notes and the Pons fit
 * line. No hooks, so a server page and a client editor can both render it.
 * `footer` is where the project editor puts its decision controls (M63).
 */
export function TemplateCard({
  template: t,
  chains,
  showSubsectors = false,
  footer,
  className,
}: {
  template: ContractTemplate;
  /** Project chains whose mainnet status to show, one pill each. */
  chains: readonly ProjectChain[];
  /** Name the subsectors the catalog places it under (the browser does, a build step does not). */
  showSubsectors?: boolean;
  footer?: React.ReactNode;
  className?: string;
}) {
  const inactive = t.status === "inactive";
  return (
    <article
      className={cn(
        "card-surface space-y-3 rounded-xl border border-ink-700/70 p-4",
        inactive && "opacity-80",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-base font-semibold text-ink-50">
          <a
            href={t.repoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-electric-200"
          >
            {t.name}
            <ExternalLink className="h-3.5 w-3.5 text-ink-500" aria-hidden />
          </a>
        </h3>
        <span className="text-xs text-ink-500">{t.provider}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="electric" className="px-2 py-0 text-[10px]">
          {TEMPLATE_KIND_LABELS[t.kind]}
        </Badge>
        <Badge className="px-2 py-0 text-[10px]">{LICENSE_CLASS_LABELS[t.licenseClass]}</Badge>
        <Badge className="px-2 py-0 text-[10px]">{AUDIT_LABELS[t.audited]}</Badge>
        <Badge className="px-2 py-0 text-[10px]">{COMPLEXITY_LABELS[t.complexity]}</Badge>
        {inactive ? <Badge className="px-2 py-0 text-[10px]">Inactive</Badge> : null}
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {chains.map((chain) => {
            const on = templateOnChain(t, chain);
            const copy = CHAIN_DEPLOYMENT_COPY[on.status];
            return (
              <StatusChip key={chain} tone={copy.tone} title={on.note} className="px-2 py-0.5 text-[11px]">
                {copy.label(chainInfo(chain).mainnetName)}
              </StatusChip>
            );
          })}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-ink-200">{t.description}</p>

      <dl className="grid gap-x-4 gap-y-1 text-xs text-ink-400 sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt className="text-ink-500">License</dt>
        <dd className="min-w-0 break-words">{t.license}</dd>
        {t.auditNote ? (
          <>
            <dt className="text-ink-500">Audits</dt>
            <dd className="min-w-0 break-words">{t.auditNote}</dd>
          </>
        ) : null}
        {t.notes ? (
          <>
            <dt className="text-ink-500">Notes</dt>
            <dd className="min-w-0 break-words">{t.notes}</dd>
          </>
        ) : null}
        {showSubsectors ? (
          <>
            <dt className="text-ink-500">Placed under</dt>
            <dd className="min-w-0">{placementLabels(t).join(" · ")}</dd>
          </>
        ) : null}
      </dl>

      {t.ponsFit ? (
        <p className="border-l-2 border-neon-500/60 pl-3 text-xs leading-relaxed text-ink-300">
          <span className="font-medium text-neon-400">{T.ponsFit}. </span>
          {t.ponsFit}
        </p>
      ) : null}

      {t.licenseClass === "restricted" || inactive ? (
        <p className="text-[11px] text-ink-500">
          {[t.licenseClass === "restricted" ? T.restrictedNote : null, inactive ? T.inactiveNote : null]
            .filter(Boolean)
            .join(" ")}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <a href={t.repoUrl} target="_blank" rel="noreferrer" className="text-electric-300 transition-colors hover:text-electric-200">
          {T.links.repo}
        </a>
        {t.docsUrl ? (
          <a href={t.docsUrl} target="_blank" rel="noreferrer" className="text-electric-300 transition-colors hover:text-electric-200">
            {T.links.docs}
          </a>
        ) : null}
      </div>

      {footer}
    </article>
  );
}

/** "Credit Lending" style labels for the subsectors a template is placed under. */
export function placementLabels(t: Pick<ContractTemplate, "subsectors">): string[] {
  return t.subsectors.map((sub) => {
    const option = ALL_SUBSECTOR_OPTIONS.find((o) => o.value === sub);
    const sector = SECTOR_OPTIONS.find((o) => o.value === sectorOfSubsector(sub));
    return [sector?.label, option?.label ?? sub].filter(Boolean).join(" ");
  });
}
