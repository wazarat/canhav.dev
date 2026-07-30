"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useModalBehavior } from "@/components/ui/useModalBehavior";

type Status = "idle" | "submitting" | "success";

const inputClasses =
  "w-full rounded-xl border border-ink-700/60 bg-ink-950/70 px-3.5 py-2.5 text-sm text-ink-50 " +
  "placeholder:text-ink-500 focus:border-electric-500/60 focus:outline-none focus:ring-1 focus:ring-electric-500/30";

export function WaitlistModal({
  open,
  onClose,
  sourcePage,
}: {
  open: boolean;
  onClose: () => void;
  /** Kept for lead attribution once the form is wired to a backend. */
  sourcePage: string;
}) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans never see it
  const [status, setStatus] = useState<Status>("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Fresh form every time the modal opens.
    setEmail("");
    setWebsite("");
    setStatus("idle");
  }, [open]);

  useModalBehavior({ onClose, containerRef, active: open });

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    // TODO: wire to backend — POST { email, sourcePage, website } to a leads endpoint.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatus("success");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join the CanHav waitlist"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-700/70 animate-fade-in-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-[1fr_240px]">
          <div className="p-6 md:p-7">
            {status === "success" ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink-50">
                  You&apos;re on the list
                </h3>
                <p className="max-w-xs text-sm leading-relaxed text-ink-300">
                  Thanks for signing up. We&apos;ll reach out as soon as early access opens.
                </p>
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-electric-400">
                  Early access
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-50">
                  Join the waitlist
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
                  Be first in line when the platform opens up. Drop your email and
                  we&apos;ll let you know.
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-ink-200">
                      Email <span className="text-rose-400">*</span>
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

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button type="submit" disabled={status === "submitting"}>
                      {status === "submitting" ? "Joining…" : "Join waitlist"}
                    </Button>
                    <p className="text-xs text-ink-500">
                      No spam. We only use this to reach out.
                    </p>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Mascot pane (decorative) */}
          <div
            aria-hidden="true"
            className="relative hidden overflow-hidden rounded-r-2xl border-l border-ink-800/60 md:block"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(92,146,255,0.18), transparent 60%), rgba(10,13,20,0.6)",
            }}
          >
            <Image
              src="/mascot-research.png"
              alt=""
              fill
              sizes="240px"
              className="object-cover object-top"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
