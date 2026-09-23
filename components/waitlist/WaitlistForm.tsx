"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Input";
import { StatusChip } from "@/components/ui/StatusChip";
import { WAITLIST_COPY } from "@/content/waitlist";
import { cn } from "@/lib/utils";

type Status = "idle" | "submitting" | "success" | "error";
type LeadType = "individual" | "team";

/**
 * The waitlist form, shared by the modal and the /waitlist page. Posts to
 * /api/leads with kind "waitlist" (same table and fields as the For Teams
 * form). The server mirrors the email into Clerk's waitlist for approval.
 */
export function WaitlistForm({
  sourcePage,
  onClose,
}: {
  /** Lead attribution, stored as `source_page` on the lead row. */
  sourcePage: string;
  /** Present inside the modal, so the success state can offer a Close button. */
  onClose?: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [leadType, setLeadType] = useState<LeadType>("individual");
  const [comments, setComments] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, humans never see it
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "waitlist",
          fullName,
          email,
          leadType,
          comments,
          sourcePage,
          website,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Request failed.");
      }
      track("lead_submitted", { kind: "waitlist", sourcePage });
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
        <StatusChip tone="success" variant="pill">
          Request received
        </StatusChip>
        <h3 className="font-display text-xl font-semibold tracking-tight text-ink-50">
          {WAITLIST_COPY.successTitle}
        </h3>
        <p className="max-w-sm text-sm leading-relaxed text-ink-300">{WAITLIST_COPY.successBody}</p>
        {onClose ? (
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-200">
            {WAITLIST_COPY.fields.name} <span className="text-rose-400">*</span>
          </span>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ada Lovelace"
            className={inputClasses}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-ink-200">
            {WAITLIST_COPY.fields.email} <span className="text-rose-400">*</span>
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className={inputClasses}
          />
        </label>
      </div>

      <div className="space-y-1.5">
        <span className="text-xs font-medium text-ink-200">{WAITLIST_COPY.fields.leadType}</span>
        <div className="flex gap-2">
          {(["individual", "team"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLeadType(value)}
              aria-pressed={leadType === value}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                leadType === value
                  ? "border-electric-500/60 bg-electric-500/15 text-electric-300"
                  : "border-ink-700/70 bg-ink-900/40 text-ink-300 hover:text-ink-100",
              )}
            >
              {value === "individual" ? "Individual" : "Team"}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-ink-200">
          {WAITLIST_COPY.fields.comments}{" "}
          <span className="text-ink-500">({WAITLIST_COPY.fields.commentsHint})</span>
        </span>
        <textarea
          rows={3}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder={WAITLIST_COPY.fields.commentsPlaceholder}
          className={cn(inputClasses, "resize-y leading-relaxed")}
        />
      </label>

      {/* Honeypot: hidden from humans, tempting to bots. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      {status === "error" && (
        <StatusChip tone="error" variant="block" role="alert">
          {errorMessage} {WAITLIST_COPY.errorSuffix}
        </StatusChip>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? WAITLIST_COPY.submitting : WAITLIST_COPY.submit}
        </Button>
        <p className="text-xs text-ink-500">{WAITLIST_COPY.privacy}</p>
      </div>
    </form>
  );
}
