import { NextResponse } from "next/server";

import { chainInfo, projectChainOf } from "@/lib/chains";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { fillWorkflow, isWorkflowName } from "@/lib/workflows/fill";

export const runtime = "nodejs";

/**
 * One GitHub Actions workflow for the project (M144), Studio+: the sync or
 * the checks template with the project's chain id and this deployment's
 * address filled in, served as a YAML attachment. Reads no file at
 * request time; the templates are a generated string module.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  if (!isWorkflowName(name)) return NextResponse.json({ error: "Unknown workflow." }, { status: 404 });
  const gate = await projectPlusGate(id, name === "sync" ? "github_sync" : "checks");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const chainId = chainInfo(projectChainOf(project.draft_doc)).chainId;
  const text = fillWorkflow(name, { chainId, origin: new URL(req.url).origin });
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Content-Disposition": `attachment; filename="canhav-${name}.yml"`,
      "Cache-Control": "no-store",
    },
  });
}
