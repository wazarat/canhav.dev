import "server-only";

/**
 * One plain Resend call for the app's operator emails (lifted from the
 * leads route in M123; the alerts worker has its own copy in
 * alerts/src/deliver.ts). False when the key is missing or Resend
 * refuses; callers treat email as best effort.
 */
export async function sendEmail(input: { to: string; subject: string; text: string; replyTo?: string; from?: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = input.from ?? process.env.LEADS_FROM_EMAIL ?? "CanHav <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], reply_to: input.replyTo, subject: input.subject, text: input.text }),
    });
    if (!res.ok) {
      console.error("[email] resend rejected", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] resend request failed", err);
    return false;
  }
}
