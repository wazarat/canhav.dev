"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { BUILD_COPY } from "@/content/build";
import { TESTER_LIMITS } from "@/lib/tester";

const RATINGS = ["1", "2", "3", "4", "5"] as const;

/** One form per step (M125): a rating, a note, the wallet once for every step. */
export function TesterForm({ token, steps }: { token: string; steps: string[] }) {
  const T = BUILD_COPY.tester.page;
  const [wallet, setWallet] = useState("");
  const [honey, setHoney] = useState("");
  const [sent, setSent] = useState<Record<number, boolean>>({});
  const [ratings, setRatings] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const send = async (i: number) => {
    setBusy(i);
    setFailed(null);
    try {
      const res = await fetch(`/api/test/${token}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepIndex: i, rating: Number(ratings[i] ?? "0"), note: notes[i] ?? "", wallet: wallet.trim(), website: honey }),
      });
      if (!res.ok) {
        setFailed(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? T.failed);
        return;
      }
      setSent((s) => ({ ...s, [i]: true }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardSection className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink-50">{T.steps}</h2>
        <Field label={T.walletLabel} hint={T.walletHint}>
          <Input value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="0x…" className="font-mono text-xs" />
        </Field>
        <input type="text" value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </CardSection>
      {steps.map((step, i) => (
        <CardSection key={i} className="space-y-3">
          <p className="text-sm text-ink-100">
            <span className="text-ink-500">{i + 1}.</span> {step}
          </p>
          {sent[i] ? (
            <p className="text-xs text-ink-400">{T.thanks}</p>
          ) : (
            <>
              <Segmented value={ratings[i] ?? ""} onChange={(v) => setRatings((r) => ({ ...r, [i]: v }))} options={RATINGS.map((r) => ({ value: r, label: r }))} ariaLabel={T.ratingLabel} />
              <p className="text-xs text-ink-500">{T.ratingHint}</p>
              <textarea
                value={notes[i] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [i]: e.target.value.slice(0, TESTER_LIMITS.note.max) }))}
                rows={2}
                placeholder={T.notePlaceholder}
                className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-600 focus:border-electric-500 focus:outline-none"
              />
              <Button size="sm" disabled={busy !== null || !ratings[i]} onClick={() => send(i)}>
                {T.send}
              </Button>
            </>
          )}
        </CardSection>
      ))}
      {failed ? (
        <CardSection>
          <p className="text-xs text-rose-400">{failed}</p>
        </CardSection>
      ) : null}
    </Card>
  );
}
