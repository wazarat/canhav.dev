"use client";

import { createContext, useContext } from "react";

/**
 * The plan of the project on the page (M134), as the server read it from
 * the project's team: whether the team is on Studio+, the team id (null
 * for a personal project) and whether the signed in account created the
 * project (so it may move it to a team). Without a provider every surface
 * reads as plus, so pages outside a project (the pricing page) are untouched.
 */
export interface ProjectPlanState {
  plus: boolean;
  orgId: string | null;
  creator: boolean;
  projectId: string | null;
  name: string;
}

const DEFAULT: ProjectPlanState = { plus: true, orgId: null, creator: false, projectId: null, name: "" };

const ProjectPlanContext = createContext<ProjectPlanState>(DEFAULT);

export function useProjectPlan(): ProjectPlanState {
  return useContext(ProjectPlanContext);
}

export function ProjectPlanProvider({ value, children }: { value: ProjectPlanState; children: React.ReactNode }) {
  return <ProjectPlanContext.Provider value={value}>{children}</ProjectPlanContext.Provider>;
}
