"use client";

import { useState } from "react";
import { BookOpen, Cable } from "lucide-react";

import { McpGuideModal } from "@/components/launch/McpGuideModal";
import { Button } from "@/components/ui/Button";

import { CopyLine } from "@/components/ui/CopyLine";
import { MCP_CONNECT, MCP_GUIDE } from "@/content/launch";
import { cn } from "@/lib/utils";

/**
 * The MCP connection card shown on launch surfaces and the studio. Static
 * copy plus copy-to-clipboard lines (components/ui/CopyLine). No wallet, no
 * auth, no network.
 */

/**
 * What the card connects to. "any" is the generic launch card, "launch" binds
 * the shared server's prompt to one token, "project" points at that project's
 * own server at /mcp/p/<id>.
 */
export type McpTarget =
  | { kind: "any" }
  | { kind: "launch"; address: string; committed: boolean }
  | { kind: "project"; id: string; name: string; hasKit?: boolean };

function lines(target: McpTarget) {
  if (target.kind === "project")
    return {
      title: MCP_CONNECT.projectTitle,
      intro: MCP_CONNECT.projectIntro,
      addLabel: MCP_CONNECT.steps.addProject,
      addCommand: MCP_CONNECT.projectAddCommand(target.id, target.name),
      askLabel: MCP_CONNECT.steps.askProject,
      prompt: MCP_CONNECT.projectPrompt(target.id, target.name),
      kitLabel: target.hasKit ? MCP_CONNECT.steps.loadKit : null,
      kitPrompt: target.hasKit ? MCP_CONNECT.kitPrompt(target.id, target.name) : null,
      note: MCP_CONNECT.projectNote,
    };
  return {
    title: MCP_CONNECT.title,
    intro: MCP_CONNECT.intro,
    addLabel: MCP_CONNECT.steps.add,
    addCommand: MCP_CONNECT.addCommand,
    askLabel: target.kind === "launch" ? MCP_CONNECT.steps.ask : MCP_CONNECT.steps.askAny,
    prompt:
      target.kind === "launch"
        ? MCP_CONNECT.promptFor(target.address, target.committed)
        : MCP_CONNECT.promptAny,
    kitLabel: null,
    kitPrompt: null,
    note: MCP_CONNECT.desktopNote,
  };
}

export function McpConnectCard({
  target = { kind: "any" },
  compact = false,
  className,
}: {
  /** Which server and which prompt. Defaults to the generic launch card. */
  target?: McpTarget;
  /** Only the add command and the prompt, for the launch success screen. */
  compact?: boolean;
  className?: string;
}) {
  const l = lines(target);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className={cn("glass rounded-2xl border border-ink-700/70 p-5 md:p-6", className)}>
      <div className="flex items-center gap-2">
        <Cable className="h-4 w-4 text-neon-300" aria-hidden />
        <h3 className="font-display text-base font-semibold tracking-tight text-ink-50">
          {l.title}
        </h3>
      </div>
      {!compact ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{l.intro}</p>
      ) : null}

      <div className="mt-4 space-y-4">
        {!compact ? (
          <CopyLine label={MCP_CONNECT.steps.install} text={MCP_CONNECT.installCommand} />
        ) : null}
        <CopyLine label={l.addLabel} text={l.addCommand} />
        <CopyLine label={l.askLabel} text={l.prompt} mono={false} />
        {l.kitLabel && l.kitPrompt ? (
          <CopyLine label={l.kitLabel} text={l.kitPrompt} mono={false} />
        ) : null}
      </div>

      {target.kind === "project" && !compact ? (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={() => setGuideOpen(true)}>
            <BookOpen aria-hidden className="h-3.5 w-3.5" /> {MCP_GUIDE.open}
          </Button>
          <McpGuideModal
            open={guideOpen}
            onClose={() => setGuideOpen(false)}
            projectId={target.id}
            name={target.name}
            hasKit={target.hasKit === true}
          />
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        {l.note}{" "}
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
  );
}
