"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { LogoField } from "@/components/ideation/LogoField";
import { StepNav } from "@/components/ideation/StepNav";
import { TextField } from "@/components/ideation/TextField";
import { SectorCards, type SectorChoice } from "@/components/studio/new/SectorCards";
import { PlanWord } from "@/components/studio/PlanWord";
import { Button } from "@/components/ui/Button";
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
  wantsToken: "yes" | "no" | "unsure" | "";
}

const STEP_KEYS = ["name", "sector", "chain", "finish"] as const;

/**
 * The new project flow (M91), the content of the studio pop up. Four
 * steps held in client state and one POST at the end, so an abandoned
 * flow leaves nothing behind. Only the name is required; the other steps
 * can be skipped by clicking ahead, as the step pills allow, and the
 * editor asks for the rest later.
 */
export function NewProjectWizard({ logoUploads, onClose }: { logoUploads: boolean; onClose: () => void }) {
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
      onClose();
      router.push(`/studio/project/${body.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : C.errors.failed);
      setWorking(false);
    }
  }

  const current = STEP_KEYS[step];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (last) void create();
        else if (current !== "name" || nameOk) go(step + 1);
      }}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6">
        <div>
          <p className="kicker"><PlanWord /></p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink-50">{C.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">{C.lead}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={C.cancel}
          className="rounded-lg border border-ink-700/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 px-5 md:px-6">
        <StepNav steps={steps} current={step} onSelect={go} />
      </div>

      <div className="mt-5 space-y-6 border-t border-ink-700/40 px-5 py-5 md:px-6">
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
                { value: "unsure", label: C.finish.tokenUnsure },
              ]}
            />
          </>
        )}

        <p className="text-xs text-ink-500">{C.editableLater}</p>
        {error ? (
          <StatusChip tone="error" variant="block">
            {error}
          </StatusChip>
        ) : null}
        {skipped ? (
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip tone="warning" variant="block" className="flex-1">
              {C.errors.designSkipped}
            </StatusChip>
            <Button asChild size="sm">
              <Link href={`/studio/project/${skipped}`} onClick={onClose}>
                {C.actions.open}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-ink-700/40 px-5 py-4 md:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={() => (step === 0 ? onClose() : go(step - 1))} disabled={working}>
          {step === 0 ? C.cancel : C.actions.back}
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
      </div>
    </form>
  );
}
