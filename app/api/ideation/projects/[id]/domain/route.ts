import { NextResponse } from "next/server";

import { addDomain, domainStatus, domainsConfigured, normalizeDomain, removeDomain } from "@/lib/domains";
import { projectPlusGate } from "@/lib/ideation-api";
import { getProject, setCustomDomain } from "@/lib/ideation-db";

export const runtime = "nodejs";

/** The project's custom domain and its DNS state (M127), Studio+. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "custom_domain");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const status = await domainStatus(project.custom_domain ?? null);
  return NextResponse.json({ ...status, slug: project.slug, published: project.status === "published", visibility: project.visibility ?? "public" });
}

/** Connect a host: added to the Vercel project, stored on the row. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "custom_domain");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!domainsConfigured()) return NextResponse.json({ error: "Custom domains are not configured on this deployment yet." }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { domain?: unknown } | null;
  const host = typeof body?.domain === "string" ? normalizeDomain(body.domain) : null;
  if (!host) return NextResponse.json({ error: "Enter a host you own, like app.example.com." }, { status: 400 });
  if ((project.visibility ?? "public") !== "public") return NextResponse.json({ error: "A private project cannot have a custom domain. Publish it public first." }, { status: 400 });
  const added = await addDomain(host);
  if (!added.ok) return NextResponse.json({ error: added.message }, { status: 400 });
  const stored = await setCustomDomain(id, gate.owner, host);
  if (!stored) {
    await removeDomain(host);
    return NextResponse.json({ error: "That host is already connected to another project." }, { status: 409 });
  }
  const status = await domainStatus(host);
  return NextResponse.json({ ...status, slug: project.slug, published: project.status === "published", visibility: project.visibility ?? "public" });
}

/** Disconnect the host on both sides. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await projectPlusGate(id, "custom_domain");
  if (gate instanceof NextResponse) return gate;
  const project = await getProject(id, gate.owner);
  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (project.custom_domain) await removeDomain(project.custom_domain);
  await setCustomDomain(id, gate.owner, null);
  return NextResponse.json({ ok: true });
}
