import { NextResponse } from "next/server";

import { PALETTE_TYPES, paletteFromImage } from "@/lib/brand/palette";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject } from "@/lib/ideation-db";
import { IMAGE_LIMITS, isStoredImageUrl } from "@/lib/images";

export const runtime = "nodejs";

/** The dominant colours of the project's logo (M118), for the swatch picker and the brand draft. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "brand");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const logo = project.draft_doc.logo;
  if (!logo || !isStoredImageUrl(logo)) return NextResponse.json({ error: "Upload a logo first, on Publish." }, { status: 400 });
  let res: Response;
  try {
    res = await fetch(logo, { signal: AbortSignal.timeout(IMAGE_LIMITS.fetchMs) });
  } catch {
    return NextResponse.json({ error: "Could not read the logo." }, { status: 502 });
  }
  if (!res.ok) return NextResponse.json({ error: "Could not read the logo." }, { status: 502 });
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!(PALETTE_TYPES as readonly string[]).includes(type))
    return NextResponse.json({ error: "Palette picking reads png and jpeg logos. Pick the colours by hand for other formats.", code: "format" }, { status: 422 });
  const buffer = Buffer.from(await res.arrayBuffer());
  const hexes = paletteFromImage(buffer, type);
  if (hexes.length === 0) return NextResponse.json({ error: "No colours found in the logo beyond greys. Pick them by hand." }, { status: 422 });
  return NextResponse.json({ hexes });
}
