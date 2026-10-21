import { type NextRequest, NextResponse } from "next/server";

import { createAlertChannel } from "@/lib/alerts/db";
import { telegramReply, verifyPairCode, webhookAuthorized } from "@/lib/alerts/telegram";
import { getProjectById } from "@/lib/ideation-db";
import { sealSecret } from "@/lib/secrets";

export const runtime = "nodejs";

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number; type?: string; title?: string; username?: string; first_name?: string };
  };
}

/**
 * The platform bot's webhook (M128), outside the Clerk matcher. Only a
 * /start with a pairing code in a private chat does anything: the code is
 * verified, the chat becomes a channel on that project and the bot says
 * so. Every request answers 200, so Telegram never retries.
 */
export async function POST(req: NextRequest) {
  if (!webhookAuthorized(req.headers.get("x-telegram-bot-api-secret-token"))) return NextResponse.json({ error: "Bad token." }, { status: 401 });
  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  const chat = message?.chat;
  const text = message?.text?.trim() ?? "";
  if (!chat || !text.startsWith("/start")) return NextResponse.json({ ok: true, ignored: "not a start" });
  if (chat.type && chat.type !== "private") {
    await telegramReply(chat.id, "Open Connect Telegram in the CanHav studio and start the bot from a private chat. Group chats come later.");
    return NextResponse.json({ ok: true, ignored: "group" });
  }
  const code = text.split(/\s+/)[1] ?? "";
  const pairing = verifyPairCode(code);
  if (!pairing) {
    await telegramReply(chat.id, "That link has expired. Open Connect Telegram in the CanHav studio again.");
    return NextResponse.json({ ok: true, ignored: "bad code" });
  }
  const project = await getProjectById(pairing.projectId);
  if (!project) {
    await telegramReply(chat.id, "That project no longer exists.");
    return NextResponse.json({ ok: true, ignored: "no project" });
  }
  const sealed = sealSecret(String(chat.id));
  if (!sealed) {
    await telegramReply(chat.id, "Alerts are not configured on this deployment yet.");
    return NextResponse.json({ ok: true, ignored: "unsealed" });
  }
  const masked = chat.username ? `@${chat.username}` : chat.first_name || chat.title || `chat ${chat.id}`;
  const result = await createAlertChannel({ projectId: project.id, kind: "telegram", configEnc: sealed, masked, createdBy: "telegram" });
  const name = project.draft_doc.name || "your project";
  await telegramReply(chat.id, result.ok ? `Connected to ${name}. Alerts for it arrive here.` : `Could not connect. ${result.message}`);
  return NextResponse.json({ ok: result.ok });
}
