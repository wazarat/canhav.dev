"use client";

import { StatusChip } from "@/components/ui/StatusChip";
import { ENVIRONMENT_COPY, FAMILY_LABELS } from "@/content/kits/copy";
import { KIT_ENVIRONMENTS } from "@/content/kits/environments";
import { type ProjectChain, chainInfo } from "@/lib/chains";
import { type FamilyEnvironment, type ProjectKit, environmentPlanFor, kitShapes } from "@/lib/kits";

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
        <h3 className="font-display text-sm font-semibold text-ink-50">{ENVIRONMENT_COPY.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-400">{ENVIRONMENT_COPY.intro}</p>
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
    </section>
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
    <span className="mt-1 block">
      <span className="text-ink-100">
        {label}, {ENVIRONMENT_COPY.status[row.status].toLowerCase()}.
      </span>{" "}
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
    </span>
  );
}
