import { NextResponse } from "next/server";

import { validateDescription, validateTelegram } from "@/content/launch";
import { getDb } from "@/lib/db";
import { hashDescription } from "@/lib/journey";
import { putTokenMetadata } from "@/lib/token-metadata-db";

export const runtime = "nodejs";

/**
 * Store the description text and Telegram handle for a launch about to be
 * signed. Only keccak256(description) goes on-chain, so the text is stored
 * first, keyed by that hash and the creator, and the token page re-verifies
 * it on every load. The client's hash must match what the server computes,
 * otherwise the client would commit a hash this store cannot serve.
 * Idempotent: a repeat of the same (hash, creator) is a no-op.
 */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  let body: {
    description?: unknown;
    telegram?: unknown;
    clientHash?: unknown;
    creator?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { description, telegram, clientHash, creator } = body;
  if (
    typeof description !== "string" ||
    typeof clientHash !== "string" ||
    typeof creator !== "string" ||
    (telegram !== null && telegram !== undefined && typeof telegram !== "string")
  ) {
    return NextResponse.json(
      { error: "Expected { description, telegram, clientHash, creator }." },
      { status: 400 },
    );
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(creator)) {
    return NextResponse.json({ error: "Invalid creator address." }, { status: 400 });
  }
  if (description.length === 0) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }
  // The stored string must be byte-identical to what the client hashed and
  // what it sends on-chain, so a value that needs trimming is rejected rather
  // than repaired here.
  if (description !== description.trim()) {
    return NextResponse.json({ error: "Description has leading or trailing whitespace." }, { status: 400 });
  }
  const descriptionProblem = validateDescription(description);
  if (descriptionProblem) return NextResponse.json({ error: descriptionProblem }, { status: 400 });

  const telegramValue = typeof telegram === "string" && telegram.length > 0 ? telegram : null;
  const telegramProblem = telegramValue ? validateTelegram(telegramValue) : undefined;
  if (telegramProblem) return NextResponse.json({ error: telegramProblem }, { status: 400 });

  const descriptionHash = hashDescription(description);
  if (descriptionHash.toLowerCase() !== clientHash.toLowerCase()) {
    return NextResponse.json(
      { error: "Client hash does not match the server's hash of the description." },
      { status: 409 },
    );
  }

  const stored = await putTokenMetadata({
    descriptionHash,
    creatorAddress: creator,
    description,
    telegram: telegramValue,
  });
  if (!stored) {
    return NextResponse.json({ error: "Could not store the description." }, { status: 500 });
  }

  return NextResponse.json({ descriptionHash }, { status: 201 });
}
