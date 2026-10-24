# Alerts worker

Monitoring and alerts for Studio+ (M123, made simple in M128). Every
minute the worker reloads the enabled rules of projects whose team is on
Studio+ (the subscription mirror, M135; rules of a team off the plan are
kept and polled again when it is active) and the channels, so a change in
the studio is live within a minute, then for each testnet reads the logs
of the addresses the rules name from the chain's cursor, decodes ownership
changes, pauses and unpauses, large token transfers (at or above a rule's
threshold, formatted with the rule's decimals) and curve graduations,
writes one `launchpad.alert_events` row per rule and log, and delivers to
the project's channels (email through Resend, Telegram through the
platform bot or a team's own bot, a Discord webhook). Every poll stamps
`checked_at` on the chain's cursor; the studio reads it as the heartbeat
("last checked 40 seconds ago", or that the worker has not checked in).

Channel secrets are AES-256-GCM encrypted under `ALERTS_SECRET` by the
app. The worker decrypts them at delivery; the app decrypts them in one
place, the test alert a team sends from the studio (`lib/alerts/send.ts`).

Shared with the app: `src/secrets.ts` (re-exported by `lib/secrets.ts`),
`src/kinds.ts` (`lib/alerts/kinds.ts`) and `src/deliver.ts`
(`lib/alerts/deliver.ts`), so the two sides agree on the kinds, the
limits, the cipher and the delivery.

## Run

```
npm ci
DATABASE_URL=... ALERTS_SECRET=... RESEND_API_KEY=... TELEGRAM_BOT_TOKEN=... npm run build && npm start
```

A chain's cursor starts at the head the first time the worker sees the
chain and follows the head while the chain has no rules, so a rule added
later starts from now. Every poll reads at most 2,000 blocks; a lagging
cursor catches up a window a minute.

## Fly

```
fly launch --no-deploy --copy-config --name canhav-alerts
fly secrets set DATABASE_URL=... ALERTS_SECRET=... RESEND_API_KEY=... TELEGRAM_BOT_TOKEN=... -a canhav-alerts
fly deploy --ha=false -a canhav-alerts
```

`fly.toml` sizes it at shared-cpu-1x with 256 MB, about $2 a month;
`npm run check:fly` at the repo root counts it.
