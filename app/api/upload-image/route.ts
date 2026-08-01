import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { keccak256 } from "viem";

import { LAUNCH_FORM } from "@/content/launch";

export const runtime = "nodejs";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Content-addressed token-image upload: key = keccak256 of the bytes, so the
 * on-chain imageURI is verifiable against the file it serves, re-uploads are
 * idempotent, and nothing can be swapped after launch.
 */
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Blob storage not configured. Create a Blob store for this project in the Vercel dashboard (Storage → Blob), then pull env again.",
      },
      { status: 503 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Expected multipart field 'file'." }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (file.size > LAUNCH_FORM.image.maxBytes) {
    return NextResponse.json({ error: "File is larger than 4 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = keccak256(buffer);

  const blob = await put(`launchpad/tokens/${hash}.${ext}`, buffer, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
    // Content-addressed: identical bytes → identical key; allow idempotent re-upload.
    allowOverwrite: true,
  });

  return NextResponse.json({ url: blob.url, hash });
}
