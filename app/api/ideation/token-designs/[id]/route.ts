import { makeEntityHandlers } from "@/lib/ideation-api";

export const runtime = "nodejs";

const h = makeEntityHandlers("token_design");
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  return h.get((await params).id);
}

export async function PATCH(req: Request, { params }: Ctx) {
  return h.patch(req, (await params).id);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return h.remove((await params).id);
}
