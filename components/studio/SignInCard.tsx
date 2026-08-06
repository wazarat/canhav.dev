"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type FlowStatus =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

/** Email magic-link sign-in for the studio. Auth only — no passwords here. */
export function SignInCard() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FlowStatus>({ kind: "idle" });

  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return (
      <StatusChip tone="warning" variant="block">
        Sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY.
      </StatusChip>
    );
  }

  if (status.kind === "sent") {
    return (
      <StatusChip tone="success" variant="block">
        Check your email — we sent a sign-in link to {email}. Open it in this
        browser to land back here signed in.
      </StatusChip>
    );
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "working" });
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setStatus({ kind: "error", message: error.message });
    else setStatus({ kind: "sent" });
  }

  return (
    <form onSubmit={sendLink} className="glass max-w-md space-y-4 rounded-2xl border border-ink-800/70 p-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink-50">Sign in</h2>
        <p className="mt-1 text-sm text-ink-400">
          A magic link, no password. Your drafts belong to this account.
        </p>
      </div>
      <Field label="Email" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </Field>
      {status.kind === "error" && <p className="text-xs text-rose-400">{status.message}</p>}
      <Button type="submit" disabled={status.kind === "working" || !email.trim()}>
        {status.kind === "working" ? "Sending…" : "Send sign-in link"}
      </Button>
    </form>
  );
}
