"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ChipRadioGroup } from "@/components/ui/ChipGroup";
import { CopyLine } from "@/components/ui/CopyLine";
import { StatusChip, type StatusTone } from "@/components/ui/StatusChip";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { AGENT_COPY } from "@/content/ideation";
import { MCP_CONNECT, MCP_GUIDE } from "@/content/launch";
import type { AgentWriteMode } from "@/lib/agent-writes";

type WriteState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; mode: AgentWriteMode };

const MODE_TONE: Record<AgentWriteMode, StatusTone> = {
  off: "warning",
  propose: "info",
  direct: "success",
};

/**
 * The full guide to connecting an agent to one project, opened from the
 * project's MCP card. Reading and writing are separate sections. The write
 * section reads the owner's current mode and lets them set it in place, so
 * someone who connected before writes existed, or who left them off, sees
 * exactly what is missing.
 */
export function McpGuideModal({
  open,
  onClose,
  projectId,
  name,
  hasKit,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  name: string;
  hasKit: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [write, setWrite] = useState<WriteState>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);
  const api = `/api/ideation/projects/${projectId}/agent`;

  useModalBehavior({ onClose, containerRef, active: open });

  useEffect(() => {
    if (!open) return;
    let live = true;
    setError(null);
    setWrite({ kind: "loading" });
    fetch(api, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { available: boolean; mode: AgentWriteMode };
        if (live) setWrite(json.available ? { kind: "ready", mode: json.mode } : { kind: "unavailable" });
      })
      .catch(() => {
        if (live) setWrite({ kind: "unavailable" });
      });
    return () => {
      live = false;
    };
  }, [open, api]);

  if (!open) return null;

  async function setMode(mode: AgentWriteMode) {
    const before = write;
    setError(null);
    setWrite({ kind: "ready", mode });
    try {
      const res = await fetch(api, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error();
      window.dispatchEvent(new Event(AGENT_COPY.modeEvent));
    } catch {
      setWrite(before);
      setError(AGENT_COPY.modeFailed);
    }
  }

  function goToChanges() {
    onClose();
    // After the dialog unmounts and the body scroll lock lifts.
    setTimeout(() => {
      document.getElementById(AGENT_COPY.anchor)?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  const S = MCP_GUIDE.sections;
  const canWrite = write.kind === "ready" && write.mode !== "off";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={MCP_GUIDE.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="glass relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-700/70 p-6 md:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={MCP_GUIDE.close}
          className="absolute right-4 top-4 z-10 rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="pr-10 font-display text-xl font-semibold tracking-tight text-ink-50">
          {MCP_GUIDE.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{MCP_GUIDE.lead}</p>

        <div className="mt-6 space-y-8">
          <GuideSection n={1} title={S.before.title}>
            <Bullets items={S.before.items} />
            <CopyLine label={MCP_CONNECT.steps.install} text={MCP_CONNECT.installCommand} />
          </GuideSection>

          <GuideSection n={2} title={S.connect.title}>
            <CopyLine label={S.connect.add} text={MCP_CONNECT.projectAddCommand(projectId, name)} />
            <p className="text-xs leading-relaxed text-ink-500">{S.connect.addNote}</p>
            <p className="text-xs font-medium text-ink-200">{S.connect.authTitle}</p>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-300">
              {S.connect.auth.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <CopyLine label={S.connect.check} text={S.connect.checkCommand} />
          </GuideSection>

          <GuideSection n={3} title={S.read.title}>
            <p className="text-sm leading-relaxed text-ink-300">{S.read.lead}</p>
            <CopyLine
              label={S.read.status}
              text={MCP_CONNECT.projectPrompt(projectId, name)}
              mono={false}
            />
            {hasKit ? (
              <>
                <CopyLine
                  label={S.read.pack}
                  text={MCP_CONNECT.kitPrompt(projectId, name)}
                  mono={false}
                />
                <CopyLine label={S.read.review} text={MCP_GUIDE.reviewCommand(projectId, name)} />
                <p className="text-xs leading-relaxed text-ink-500">{S.read.reviewNote}</p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-ink-500">{S.read.packNone}</p>
            )}
          </GuideSection>

          <GuideSection n={4} title={S.write.title}>
            <p className="text-sm leading-relaxed text-ink-300">{S.write.lead}</p>

            {write.kind === "loading" ? (
              <StatusChip tone="neutral">{S.write.loading}</StatusChip>
            ) : write.kind === "unavailable" ? (
              <StatusChip tone="neutral" variant="block">
                {S.write.unavailable}
              </StatusChip>
            ) : (
              <>
                <ChipRadioGroup
                  label={S.write.modeLabel}
                  value={write.mode}
                  onChange={setMode}
                  options={AGENT_COPY.modes}
                />
                <StatusChip tone={MODE_TONE[write.mode]} variant="block">
                  {S.write[write.mode]}
                </StatusChip>
              </>
            )}
            {error ? <p className="text-xs text-rose-400">{error}</p> : null}

            {canWrite ? (
              <>
                <p className="text-xs leading-relaxed text-ink-500">{S.write.already}</p>
                <CopyLine
                  label={S.write.fill}
                  text={MCP_GUIDE.fillPrompt(projectId, name)}
                  mono={false}
                />
                {hasKit ? (
                  <CopyLine
                    label={S.write.steps}
                    text={MCP_GUIDE.stepsPrompt(projectId, name)}
                    mono={false}
                  />
                ) : null}
                <CopyLine
                  label={S.write.token}
                  text={MCP_GUIDE.tokenPrompt(projectId, name)}
                  mono={false}
                />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-ink-200">{S.write.review}</p>
                  <p className="text-sm leading-relaxed text-ink-300">{S.write.reviewBody}</p>
                  <Button size="sm" variant="outline" onClick={goToChanges}>
                    {S.write.goToChanges}
                  </Button>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-200">{S.write.cannot}</p>
              <Bullets items={S.write.cannotItems} />
            </div>
          </GuideSection>

          <GuideSection n={5} title={S.other.title}>
            <p className="text-sm leading-relaxed text-ink-300">{S.other.body}</p>
            <CopyLine label={S.other.url} text={MCP_CONNECT.projectServerUrl(projectId)} />
          </GuideSection>

          <GuideSection n={6} title={S.trouble.title}>
            <dl className="space-y-3">
              {S.trouble.items.map((item) => (
                <div key={item.q}>
                  <dt className="text-sm font-medium text-ink-100">{item.q}</dt>
                  <dd className="mt-0.5 text-sm leading-relaxed text-ink-300">{item.a}</dd>
                </div>
              ))}
            </dl>
            <CopyLine label={S.trouble.remove} text={MCP_GUIDE.removeCommand(projectId, name)} />
          </GuideSection>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-ink-500">
          {MCP_CONNECT.projectNote}{" "}
          <a
            href={MCP_CONNECT.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-electric-300 transition-colors hover:text-electric-200"
          >
            {MCP_CONNECT.docsLabel} →
          </a>
        </p>
      </div>
    </div>,
    document.body,
  );
}

function GuideSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <h3 className="flex items-center gap-2.5 font-display text-base font-semibold text-ink-50">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-700 text-xs font-medium text-ink-300">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-300">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
