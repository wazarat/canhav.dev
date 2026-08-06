import { makeEntityHandlers } from "@/lib/ideation-api";

export const runtime = "nodejs";

const h = makeEntityHandlers("project");

export async function POST(req: Request) {
  return h.create(req);
}

export async function GET() {
  return h.list();
}
