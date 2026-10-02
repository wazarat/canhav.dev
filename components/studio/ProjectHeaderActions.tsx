"use client";

import { useState } from "react";
import { Cable } from "lucide-react";

import { McpGuideModal } from "@/components/launch/McpGuideModal";
import { Button } from "@/components/ui/Button";
import { LAUNCH_PROJECT_COPY, MCP_CONNECT } from "@/content/launch";

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
