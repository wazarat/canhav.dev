import { NextResponse } from "next/server";

import { authGate } from "@/lib/ideation-api";
import { IMAGES_NOT_CONFIGURED, imagesConfigured, storeImage } from "@/lib/images";

export const runtime = "nodejs";

/**
 * Content-addressed image upload for token images and logos (M90 moved the
 * store to lib/images.ts, shared with the MCP set_logo tool): key =
 * keccak256 of the bytes, so the on-chain imageURI is verifiable against the
 * file it serves, re-uploads are idempotent, and nothing can be swapped
 * after launch.
 */
export async function POST(req: Request) {
  // Every write through the app needs a signed-in account.
  const gate = await authGate();
  if (gate instanceof NextResponse) return gate;
  if (!imagesConfigured()) return NextResponse.json({ error: IMAGES_NOT_CONFIGURED }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected multipart field 'file'." }, { status: 400 });
  }
  const stored = await storeImage(Buffer.from(await file.arrayBuffer()), file.type);
  if (!stored.ok) return NextResponse.json({ error: stored.message }, { status: 400 });
  return NextResponse.json({ url: stored.url, hash: stored.hash });
}
