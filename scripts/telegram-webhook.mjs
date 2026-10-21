#!/usr/bin/env node
/**
 * Point the platform Telegram bot at the app's webhook (M128). Run once per
 * bot, after TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are set, against
 * the production host (a preview host sits behind Deployment Protection and
 * would answer 401):
 *
 *   node --env-file=.env.production.local scripts/telegram-webhook.mjs
 *   node --env-file=.env.production.local scripts/telegram-webhook.mjs --check
 *
 * --check prints getWebhookInfo and changes nothing. APP_URL overrides the
 * host (default https://canhav.com).
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const host = (process.env.APP_URL ?? "https://canhav.com").replace(/\/$/, "");
if (!token || !secret) {
  console.error("TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET are required");
  process.exit(1);
}
const api = (method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then((r) => r.json());

if (process.argv.includes("--check")) {
  const info = await api("getWebhookInfo");
  console.log(JSON.stringify(info.result ?? info, null, 2));
  process.exit(info.ok ? 0 : 1);
}
const me = await api("getMe");
if (!me.ok) {
  console.error("getMe failed", me.description);
  process.exit(1);
}
const result = await api("setWebhook", {
  url: `${host}/api/webhooks/telegram`,
  secret_token: secret,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});
console.log(result.ok ? `Webhook set for @${me.result.username} at ${host}/api/webhooks/telegram` : `setWebhook failed: ${result.description}`);
process.exit(result.ok ? 0 : 1);
