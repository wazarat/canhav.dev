# Alerts worker

Monitoring and alerts for Studio+ (M123). Every minute, for each testnet,
the worker reads the logs of the addresses that enabled rules name from
the chain's cursor, decodes ownership changes, pauses and unpauses, large
token transfers (at or above a rule's threshold) and curve graduations,
writes one `launchpad.alert_events` row per rule and log, and delivers to
the project's channels (email through Resend, a Telegram bot, a Discord
webhook). Channel secrets are AES-256-GCM encrypted under `ALERTS_SECRET`
by the app and decrypted only here.

Shared with the app: `src/secrets.ts` (re-exported by `lib/secrets.ts`)
and `src/kinds.ts` (`lib/alerts/kinds.ts`), so the two sides agree on the
kinds, the limits and the cipher.

## Run

```
npm ci
DATABASE_URL=... ALERTS_SECRET=... RESEND_API_KEY=... npm run build && npm start
```

A chain's cursor starts at the head the first time the worker sees a rule
for it, so nothing before that is alerted. Every poll reads at most 2,000
blocks; a lagging cursor catches up a window a minute.

## Fly

```
fly launch --no-deploy --copy-config --name canhav-alerts
fly secrets set DATABASE_URL=... ALERTS_SECRET=... RESEND_API_KEY=... -a canhav-alerts
fly deploy
```

`fly.toml` sizes it at shared-cpu-1x with 256 MB, about $2 a month;
`npm run check:fly` at the repo root counts it.
