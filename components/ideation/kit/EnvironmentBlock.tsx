"use client";

import { InfoTip } from "@/components/ui/InfoTip";
import { StatusChip } from "@/components/ui/StatusChip";
import { ENVIRONMENT_COPY, FAMILY_LABELS } from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { templateById } from "@/content/templates";
import { CHAIN_DEPLOYMENT_COPY, TEMPLATE_COPY } from "@/content/templates/copy";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import { type FamilyEnvironment, type ProjectKit, environmentPlanFor, kitShapes } from "@/lib/kits";
import { templateOnChain } from "@/lib/templates";

/**
 * The Reality step's "Where this runs today" block. One StatusChip per
 * family the chosen shapes rely on, the project's chain first, with the testnet and
 * mainnet status and note, then the shared three-stage development path.
 * Renders nothing without a shape. The MCP tool returns the same rows.
 */
export function EnvironmentBlock({ kit, chain }: { kit: ProjectKit | undefined; chain: ProjectChain }) {
  const families = environmentPlanFor(kitShapes(kit), KIT_ENVIRONMENTS[chain], chainInfo(chain).family);
  if (families.length === 0) return null;
  const checkedOn = families.map((f) => f.checkedOn).sort().at(-1);
  return (
    <section className="space-y-3" aria-label={ENVIRONMENT_COPY.title}>
      <div>
        <h3 className="inline-flex items-center gap-1 font-display text-sm font-semibold text-ink-50">
          {ENVIRONMENT_COPY.title}
          <InfoTip>{ENVIRONMENT_COPY.intro}</InfoTip>
        </h3>
      </div>
      <div className="space-y-2">
        {families.map((f) => (
          <FamilyRow key={f.family} env={f} />
        ))}
      </div>
      <div className="text-xs leading-relaxed text-ink-400">
        <p className="font-medium text-ink-300">{ENVIRONMENT_COPY.pathTitle}</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          {families[0].devPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {ownPaths(families).map((f) => (
          <div key={f.family} className="mt-2">
            <p className="font-medium text-ink-300">{ENVIRONMENT_COPY.pathTitleFor(FAMILY_LABELS[f.family])}</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5">
              {f.devPath.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
        {checkedOn ? <p className="mt-2 text-ink-500">{ENVIRONMENT_COPY.checked(checkedOn)}</p> : null}
      </div>
      <AcceptedOnChain kit={kit} chain={chain} />
    </section>
  );
}

/** Where each accepted contract template stands on the project's mainnet (M63). Nothing when none is accepted. */
function AcceptedOnChain({ kit, chain }: { kit: ProjectKit | undefined; chain: ProjectChain }) {
  const accepted = Object.entries(kit?.templates ?? {})
    .filter(([, d]) => d === "accepted")
    .map(([id]) => templateById(id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  if (!accepted.length) return null;
  const name = chainInfo(chain).mainnetName;
  return (
    <div className="space-y-2 border-t border-ink-800/70 pt-3">
      <div>
        <h4 className="inline-flex items-center gap-1 text-sm font-medium text-ink-100">
          {TEMPLATE_COPY.envTitle(name)}
          <InfoTip>{TEMPLATE_COPY.envIntro}</InfoTip>
        </h4>
      </div>
      {accepted.map((t) => {
        const on = templateOnChain(t, chain);
        const copy = CHAIN_DEPLOYMENT_COPY[on.status];
        return (
          <StatusChip key={t.id} tone={copy.tone} variant="block">
            <span className="block font-medium text-ink-100">
              {t.name}, {copy.label(name).toLowerCase()}.
            </span>
            {on.note ? <span className="mt-1 block">{on.note}</span> : null}
          </StatusChip>
        );
      })}
    </div>
  );
}

/** Families after the first whose path is not the shared one. */
export function ownPaths(families: readonly FamilyEnvironment[]): FamilyEnvironment[] {
  const shared = families[0]?.devPath.join("\n");
  return families.slice(1).filter((f) => f.devPath.join("\n") !== shared);
}

function FamilyRow({ env }: { env: FamilyEnvironment }) {
  return (
    <StatusChip tone={ENVIRONMENT_COPY.tone[env.testnet.status]} variant="block">
      <span className="block font-medium text-ink-100">{FAMILY_LABELS[env.family]}</span>
      <Network label={ENVIRONMENT_COPY.testnet(env.testnet.chainId)} row={env.testnet} />
      <Network label={ENVIRONMENT_COPY.mainnet(env.mainnet.chainId)} row={env.mainnet} />
    </StatusChip>
  );
}

function Network({
  label,
  row,
}: {
  label: string;
  row: FamilyEnvironment["testnet"] | FamilyEnvironment["mainnet"];
}) {
  return (
    <span className="mt-1 flex items-center gap-1">
      <span className="text-ink-100">
        {label}, {ENVIRONMENT_COPY.status[row.status].toLowerCase()}.
      </span>
      {row.note || row.source ? (
        <InfoTip label={label}>
          {row.note}
          {row.source ? (
            <>
              {" "}
              <a
                href={row.source}
                target="_blank"
                rel="noreferrer"
                className="text-electric-400 transition-colors hover:text-ink-50"
              >
                {ENVIRONMENT_COPY.source}
              </a>
            </>
          ) : null}
        </InfoTip>
      ) : null}
    </span>
  );
}
