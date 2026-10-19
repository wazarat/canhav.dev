/**
 * Delivery to the three channel kinds (M123). Each returns ok or the error
 * text, recorded per channel on the event so the studio can show what
 * arrived. Plain fetch, no SDKs.
 */
import type { ChannelKind } from "./kinds.js";

export interface Delivery {
  ok: boolean;
  error?: string;
}

export async function deliver(kind: ChannelKind, target: string, subject: string, text: string, env: { resendKey?: string; from?: string }): Promise<Delivery> {
  try {
    if (kind === "email") {
      if (!env.resendKey) return { ok: false, error: "RESEND_API_KEY missing" };
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: env.from ?? "CanHav Alerts <onboarding@resend.dev>", to: [target], subject, text }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
    }
    if (kind === "telegram") {
      // target is "<bot token>:<chat id>" joined by a space, see the studio's hint.
      const [token, chatId] = target.split(" ");
      if (!token || !chatId) return { ok: false, error: "bot token and chat id expected" };
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `${subject}\n${text}`, disable_web_page_preview: true }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
    }
    const res = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `**${subject}**\n${text}` }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  } catch (err) {
    return { ok: false, error: (err as Error).message.slice(0, 200) };
  }
}
