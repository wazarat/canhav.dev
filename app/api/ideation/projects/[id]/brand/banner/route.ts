import { NextResponse } from "next/server";

import { bannerSvg, isBannerKind } from "@/lib/brand/banner";
import { DEFAULT_BRAND } from "@/lib/brand/record";
import { projectPlusGate } from "@/lib/ideation-api";
import { getLinkedTokenDesign, getProject } from "@/lib/ideation-db";

export const runtime = "nodejs";

/** A social banner as SVG (M118): ?kind=x, og or square. The team downloads it from Decisions. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "brand");
  if (gate instanceof NextResponse) return gate;
  const kind = new URL(req.url).searchParams.get("kind");
  if (!isBannerKind(kind)) return NextResponse.json({ error: "kind is x, og or square." }, { status: 400 });
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const design = await getLinkedTokenDesign(project.id);
  const doc = project.draft_doc;
  const svg = bannerSvg(kind, {
    name: doc.name,
    ticker: design?.draft_doc.ticker ?? null,
    tagline: doc.brand?.tagline ?? null,
    logoUrl: doc.logo ?? null,
    brand: doc.brand ?? DEFAULT_BRAND,
  });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${(doc.name || "project").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${kind}.svg"`,
      "Cache-Control": "no-store",
    },
  });
}
