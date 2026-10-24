import { ImageResponse } from "next/og";

import { DEFAULT_BRAND } from "@/lib/brand/record";
import { getProjectBySlug } from "@/lib/ideation-db";
import { projectPlus } from "@/lib/plan-project";

export const runtime = "nodejs";
export const alt = "CanHav project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The public page's share image (M118), in the project's brand palette.
 * A private project gets the plain card, so the link preview says nothing
 * about it.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getProjectBySlug(slug);
  const doc = row && row.visibility !== "private" ? row.draft_doc : null;
  // The brand palette is a Studio+ block, shown while the team is on the plan (M134).
  const brand = doc?.brand && row && (await projectPlus(row)) ? doc.brand : DEFAULT_BRAND;
  const p = brand.palette;
  const light = (() => {
    const n = parseInt(p.surface.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  })();
  const text = light ? "#0b0f1a" : "#f5f7fb";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 64, backgroundColor: p.surface, backgroundImage: `linear-gradient(135deg, ${p.primary}59, ${p.secondary}26)`, color: text, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {doc?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={doc.logo} alt="" width={120} height={120} style={{ borderRadius: 24, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 120, height: 120, borderRadius: 24, background: p.primary }} />
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{doc?.name || "CanHav"}</div>
            <div style={{ fontSize: 28, opacity: 0.8, marginTop: 12 }}>{doc ? brand.tagline || doc.whatItDoes.slice(0, 90) : "DeFi ecosystem solutions for capital markets."}</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: p.accent }} />
      </div>
    ),
    { ...size },
  );
}
