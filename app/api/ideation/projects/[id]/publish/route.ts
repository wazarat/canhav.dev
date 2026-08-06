import { makeEntityHandlers } from "@/lib/ideation-api";

export const runtime = "nodejs";

const h = makeEntityHandlers("project");
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  return h.publish((await params).id);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return h.unpublish((await params).id);
}
