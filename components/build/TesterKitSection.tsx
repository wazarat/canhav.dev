"use client";

import { useEffect, useState } from "react";

import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { Field, Input } from "@/components/ui/Input";
import { BUILD_COPY } from "@/content/build";
import { TESTER_LIMITS, type TesterFeedback, type TesterInvite, inviteState, testerPath } from "@/lib/tester";

/**
 * The tester kit under the Testnet milestone (M125, Studio+): the invite
 * links with their use, expiry and feedback, a form for a new one (a
 * name, the steps one per line, a cap and a length), and the feedback
 * testers left. PlusGate for a free account.
 */
export function TesterKitSection({ projectId }: { projectId: string }) {
  return (
    <PlusGate feature="tester_kit">
      <Inner projectId={projectId} />
    </PlusGate>
  );
}

function Inner({ projectId }: { projectId: string }) {
  const C = BUILD_COPY.tester;
  const [data, setData] = useState<{ invites: TesterInvite[]; feedback: TesterFeedback[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [steps, setSteps] = useState("");
  const [maxUses, setMaxUses] = useState(String(TESTER_LIMITS.maxUses.default));
  const [days, setDays] = useState(String(TESTER_LIMITS.days.default));
  const [fresh, setFresh] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const load = async () => {
    const res = await fetch(`/api/ideation/projects/${projectId}/testers`);
    if (!res.ok) {
      setFailed(C.loadFailed);
      return;
    }
    setData((await res.json()) as { invites: TesterInvite[]; feedback: TesterFeedback[] });
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const create = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/testers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), steps: steps.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, TESTER_LIMITS.steps.max), maxUses: Number(maxUses) || undefined, days: Number(days) || undefined }),
      });
      if (!res.ok) {
        setFailed(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? C.failed);
        return;
      }
      const { invite } = (await res.json()) as { invite: TesterInvite };
      setFresh(`${origin}${testerPath(invite.token)}`);
      setLabel("");
      setSteps("");
      await load();
    } finally {
      setBusy(false);
    }
  };
  const revoke = async (token: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/testers/${token}`, { method: "DELETE" });
      if (!res.ok) setFailed(C.failed);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!data && !failed) return <p className="text-xs text-ink-500">{C.loading}</p>;
  const stepCount = steps.split("\n").filter((s) => s.trim()).length;

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-500">{C.intro}</p>
      {data?.invites.length ? (
        <ul className="space-y-2 text-xs text-ink-300">
          {data.invites.map((i) => {
            const state = inviteState(i);
            return (
              <li key={i.token} className="flex flex-wrap items-center gap-2">
                <span className="text-ink-200">{i.label}</span>
                <span className="text-ink-500">
                  {C.states[state]} · {C.uses(i.uses, i.maxUses)} · {C.until(new Date(i.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}
                  {i.feedbackCount ? ` · ${C.feedbackLine(i.feedbackCount, i.averageRating)}` : ""}
                </span>
                {state === "open" ? (
                  <>
                    <a href={testerPath(i.token)} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                      {C.openLink}
                    </a>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => revoke(i.token)}>
                      {C.revoke}
                    </Button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-ink-500">{C.none}</p>
      )}
      {fresh ? <CopyBlock label={C.freshLabel} text={fresh} hint={C.freshHint} /> : null}

      <div className="space-y-3">
        <Field label={C.labelLabel}>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={C.labelPlaceholder} maxLength={TESTER_LIMITS.label.max} />
        </Field>
        <Field label={C.stepsLabel} hint={C.stepsHint(stepCount, TESTER_LIMITS.steps.max)}>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={4}
            placeholder={C.stepsPlaceholder}
            className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-electric-500 focus:outline-none"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={C.maxUsesLabel}>
            <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" />
          </Field>
          <Field label={C.daysLabel}>
            <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" />
          </Field>
        </div>
        <Button size="sm" disabled={busy || !label.trim() || stepCount === 0} onClick={create}>
          {C.create}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-200">{C.feedback}</p>
        {data?.feedback.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {data.feedback.map((f) => (
              <li key={f.id}>
                <span className="text-ink-200">{C.step(f.stepIndex + 1)}</span> · {C.rating(f.rating)}
                {f.wallet ? ` · ${f.wallet.slice(0, 6)}…${f.wallet.slice(-4)}` : ""} · {f.inviteLabel} · {new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {f.note ? <span className="block text-ink-400">{f.note}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{C.noFeedback}</p>
        )}
      </div>
      {failed ? <p className="text-xs text-rose-400">{failed}</p> : null}
    </div>
  );
}
