"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LogoField } from "@/components/ideation/LogoField";
import { NameTickerCheck } from "@/components/ideation/NameTickerCheck";
import { StepNav } from "@/components/ideation/StepNav";
import { TextField } from "@/components/ideation/TextField";
import { SectorCards, type SectorChoice } from "@/components/studio/new/SectorCards";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { SegmentedField } from "@/components/ui/Segmented";
import { StatusChip } from "@/components/ui/StatusChip";
import { CHAIN_COPY, LOGO_COPY } from "@/content/ideation";
import { NEW_PROJECT_COPY } from "@/content/studio-new";
import { DEFAULT_PROJECT_CHAIN, type ProjectChain } from "@/lib/chains";
import { PROJECT_LIMITS } from "@/lib/ideation";

interface Draft {
  name: string;
  sector: SectorChoice;
  chain: ProjectChain;
  whatItDoes: string;
  logo?: string;
  wantsToken: "yes" | "no" | "";
}

const STEP_KEYS = ["name", "sector", "chain", "finish"] as const;

/**
 * The new project flow (M91). Four steps held in client state and one POST
 * at the end, so an abandoned flow leaves nothing behind. Only the name is
 * required; the other steps can be skipped by clicking ahead, as the step
 * pills allow, and the editor asks for the rest later.
 */
export function NewProjectWizard({ logoUploads }: { logoUploads: boolean }) {
  const C = NEW_PROJECT_COPY;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    sector: "",
    chain: DEFAULT_PROJECT_CHAIN,
    whatItDoes: "",
    wantsToken: "",
  });
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The project exists but its token design could not be made or linked. */
  const [skipped, setSkipped] = useState<string | null>(null);

  const nameOk = draft.name.trim().length >= PROJECT_LIMITS.name.min;
  const steps = STEP_KEYS.map((key) => ({
    key,
    label: C.steps[key],
    problem: key === "name" && !nameOk ? C.name.problem : null,
  }));
  const last = step === STEP_KEYS.length - 1;
  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const go = (i: number) => setStep(Math.max(0, Math.min(STEP_KEYS.length - 1, i)));

  async function create() {
    if (!nameOk || working) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/ideation/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          sectors: draft.sector && draft.sector !== "undecided" ? [draft.sector] : [],
          chain: draft.chain,
          whatItDoes: draft.whatItDoes.trim(),
          logo: draft.logo,
          withTokenDesign: draft.wantsToken === "yes",
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; tokenDesignId?: string | null; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? C.errors.failed);
      if (draft.wantsToken === "yes" && !body.tokenDesignId) {
        setSkipped(body.id);
        setWorking(false);
        return;
      }
      router.push(`/studio/project/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : C.errors.failed);
      setWorking(false);
    }
  }

  const current = STEP_KEYS[step];

  return (
    <div className="container py-14 md:py-20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="kicker">
            <Link href="/studio" className="transition-colors hover:text-ink-200">
              {C.kicker}
            </Link>{" "}
            / {C.title}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink-50 md:text-5xl">{C.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink-400">{C.lead}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/studio">{C.cancel}</Link>
        </Button>
      </div>

      <div className="mt-8">
        <StepNav steps={steps} current={step} onSelect={go} />
      </div>

      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (last) void create();
          else if (current !== "name" || nameOk) go(step + 1);
        }}
      >
        <Card className={current === "sector" ? "max-w-4xl" : "max-w-2xl"}>
          <CardSection className="space-y-6">
            {current === "name" && (
              <TextField
                label={C.name.label}
                required
                hint={C.name.hint}
                value={draft.name}
                onChange={(v) => patch({ name: v })}
                min={PROJECT_LIMITS.name.min}
                max={PROJECT_LIMITS.name.max}
                placeholder={C.name.placeholder}
              />
            )}

            {current === "sector" && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-ink-200">{C.sector.label}</p>
                  <p className="mt-1 text-xs text-ink-500">{C.sector.hint}</p>
                </div>
                <SectorCards value={draft.sector} onChange={(sector) => patch({ sector })} />
              </div>
            )}

            {current === "chain" && (
              <>
                <SegmentedField
                  label={CHAIN_COPY.label}
                  info={CHAIN_COPY.hint}
                  value={draft.chain}
                  onChange={(v) => patch({ chain: v as ProjectChain })}
                  options={CHAIN_COPY.options}
                />
                <TextField
                  label={C.chain.whatItDoesLabel}
                  hint={C.chain.whatItDoesHint}
                  value={draft.whatItDoes}
                  onChange={(v) => patch({ whatItDoes: v })}
                  max={PROJECT_LIMITS.whatItDoes.max}
                  rows={3}
                  placeholder={C.chain.whatItDoesPlaceholder}
                />
              </>
            )}

            {current === "finish" && (
              <>
                {logoUploads ? (
                  <LogoField value={draft.logo} onChange={(logo) => patch({ logo })} hint={LOGO_COPY.projectHint} />
                ) : (
                  <StatusChip tone="warning" variant="block">
                    {C.finish.uploadsOff}
                  </StatusChip>
                )}
                <SegmentedField
                  label={C.finish.tokenLabel}
                  info={C.finish.tokenHint}
                  value={draft.wantsToken}
                  onChange={(v) => patch({ wantsToken: v as Draft["wantsToken"] })}
                  options={[
                    { value: "yes", label: C.finish.tokenYes },
                    { value: "no", label: C.finish.tokenNo },
                  ]}
                />
                {draft.wantsToken === "yes" ? (
                  <NameTickerCheck designId="" name={draft.name} ticker="" />
                ) : null}
              </>
            )}
          </CardSection>

          <CardSection className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => go(step - 1)} disabled={step === 0 || working}>
              {C.actions.back}
            </Button>
            {last ? (
              <Button type="submit" size="sm" disabled={!nameOk || working} aria-busy={working}>
                {working ? C.actions.creating : C.actions.create}
              </Button>
            ) : (
              <Button type="submit" size="sm" variant="outline" disabled={current === "name" && !nameOk}>
                {C.actions.next}
              </Button>
            )}
          </CardSection>
        </Card>
        {error ? (
          <div className="mt-4 max-w-2xl">
            <StatusChip tone="error" variant="block">
              {error}
            </StatusChip>
          </div>
        ) : null}
        {skipped ? (
          <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-3">
            <StatusChip tone="warning" variant="block" className="flex-1">
              {C.errors.designSkipped}
            </StatusChip>
            <Button asChild size="sm">
              <Link href={`/studio/project/${skipped}`}>{C.actions.open}</Link>
            </Button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
