/**
 * Delivery to the three channel kinds (M123). Each returns ok or the error
 * text, recorded per channel on the event so the studio can show what
 * arrived. Plain fetch, no SDKs. Shared with the app since M128 (the test
 * alert and the Discord hello go out from a route through the same code).
 */
import type { ChannelKind } from "./kinds.js";

export interface Delivery {
  ok: boolean;
  error?: string;
}

export interface DeliveryEnv {
  resendKey?: string;
  from?: string;
  /** The platform bot (M128); a Telegram target that is only a chat id goes through it. */
  telegramToken?: string;
}

const TIMEOUT_MS = 8_000;

async function post(url: string, body: unknown, headers: Record<string, string> = {}): Promise<Delivery> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  return res.ok ? { ok: true } : { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
}

/**
 * A Telegram target is either "<chat id>" for the platform bot or
 * "<bot token> <chat id>" for a team's own bot.
 */
export function telegramParts(target: string, platformToken: string | undefined): { token: string; chatId: string } | null {
  const trimmed = target.trim();
  if (trimmed.includes(" ")) {
    const [token, chatId] = trimmed.split(/\s+/);
    return token && chatId ? { token, chatId } : null;
  }
  return platformToken && trimmed ? { token: platformToken, chatId: trimmed } : null;
}

export async function deliver(kind: ChannelKind, target: string, subject: string, text: string, env: DeliveryEnv): Promise<Delivery> {
  try {
    if (kind === "email") {
      if (!env.resendKey) return { ok: false, error: "RESEND_API_KEY missing" };
      return await post(
        "https://api.resend.com/emails",
        { from: env.from ?? "CanHav Alerts <onboarding@resend.dev>", to: [target], subject, text },
        { Authorization: `Bearer ${env.resendKey}` },
      );
    }
    if (kind === "telegram") {
      const parts = telegramParts(target, env.telegramToken);
      if (!parts) return { ok: false, error: env.telegramToken ? "bot token and chat id expected" : "TELEGRAM_BOT_TOKEN missing" };
      return await post(`https://api.telegram.org/bot${parts.token}/sendMessage`, { chat_id: parts.chatId, text: `${subject}\n${text}`, disable_web_page_preview: true });
    }
    // Discord answers 204 without wait; with it, a bad webhook answers with its status.
    return await post(`${target}${target.includes("?") ? "&" : "?"}wait=true`, { content: `**${subject}**\n${text}` });
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 200) };
  }
}
