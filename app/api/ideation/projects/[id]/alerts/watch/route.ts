import { NextResponse } from "next/server";

import { countChannels, createAlertChannel } from "@/lib/alerts/db";
import { watchInputSchema } from "@/lib/alerts/schema";
import { setWatch } from "@/lib/alerts/watch";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { sealSecret } from "@/lib/secrets";

export const runtime = "nodejs";

/**
 * The Watch switch (M128). On creates a rule per recorded contract and
 * token and, when the project has no channel yet, an email channel from
 * the signed in account; off deletes the switch's rules and leaves the
 * channels and any rule from the per address form.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "monitoring");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = watchInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the switch." }, { status: 400 });
  const result = await setWatch(project, parsed.data.enabled, gate.id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  let email: "added" | "exists" | "none" | "unsealed" = "exists";
  if (parsed.data.enabled && (await countChannels(id)) === 0) {
    if (!gate.email) email = "none";
    else {
      const sealed = sealSecret(gate.email);
      if (!sealed) email = "unsealed";
      else {
        const added = await createAlertChannel({ projectId: id, kind: "email", configEnc: sealed, masked: gate.email, createdBy: gate.id });
        email = added.ok ? "added" : "unsealed";
      }
    }
  }
  return NextResponse.json({ enabled: parsed.data.enabled, rules: result.rules, email });
}
