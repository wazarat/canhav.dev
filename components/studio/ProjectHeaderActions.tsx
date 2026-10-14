"use client";

import { useEffect, useState } from "react";
import { Cable } from "lucide-react";

import { McpGuideModal } from "@/components/launch/McpGuideModal";
import { Button } from "@/components/ui/Button";
import { AGENT_COPY, STUDIO_COPY } from "@/content/ideation";
import { LAUNCH_PROJECT_COPY, MCP_CONNECT } from "@/content/launch";
import { registerCommands } from "@/lib/command-menu";

/**
 * The two buttons across from a project's name in the studio (M56). One
 * scrolls to the Token launch panel, the other opens the agent guide with
 * the prompt to paste.
 */
export function ProjectHeaderActions({
  projectId,
  name,
  hasKit,
  hasLaunch,
}: {
  projectId: string;
  name: string;
  hasKit: boolean;
  /** True once a launch is linked, which changes the first button's label. */
  hasLaunch: boolean;
}) {
  const [guideOpen, setGuideOpen] = useState(false);

  // This project's entries in the command menu (M87).
  useEffect(() => {
    const C = STUDIO_COPY.command;
    return registerCommands("project-header", [
      {
        id: "project:copy-mcp",
        label: C.copyMcp,
        group: C.groups.project,
        hint: C.copyMcpHint,
        keywords: "mcp agent claude connect",
        run: () => navigator.clipboard.writeText(MCP_CONNECT.projectAddCommand(projectId, name)),
      },
      {
        id: "project:agent-guide",
        label: C.agentGuide,
        group: C.groups.project,
        keywords: "mcp agent prompt",
        run: () => setGuideOpen(true),
      },
      {
        id: "project:agent-changes",
        label: C.reviewChanges,
        group: C.groups.project,
        keywords: "agent proposals session",
        run: () => document.getElementById(AGENT_COPY.anchor)?.scrollIntoView({ behavior: "smooth" }),
      },
    ]);
  }, [projectId, name]);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          document
            .getElementById(LAUNCH_PROJECT_COPY.panelAnchor)
            ?.scrollIntoView({ behavior: "smooth" })
        }
      >
        {hasLaunch ? LAUNCH_PROJECT_COPY.headerLinked : LAUNCH_PROJECT_COPY.headerLink}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setGuideOpen(true)}>
        <Cable aria-hidden className="h-3.5 w-3.5" /> {MCP_CONNECT.openPrompt}
      </Button>
      <McpGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        projectId={projectId}
        name={name}
        hasKit={hasKit}
      />
    </>
  );
}
