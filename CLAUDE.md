# canhav.dev — internal conventions

Next.js app router + Tailwind 3.4, dark theme only. Palette is the custom `ink`
scale plus `electric` (blue), `neon` (violet), `signal` (cyan) accents from
`tailwind.config.ts`. `cn()` (clsx + tailwind-merge) lives in `lib/utils.ts`.

## UI conventions

### Status surfaces — always `StatusChip`

Every status pill, badge, or message box (network state, sale phase, tranche
state, tx success/error, callouts) uses `components/ui/StatusChip.tsx`: a
translucent `.glass` chip with a thin ink border and neutral `ink-200` text —
the **only** color is the small status dot.

- `variant="pill"` for one-line states, `variant="block"` for multiline
  messages. Pass `onClick` to get a `<button>` with hover state.
- Tones: `success` (connected, live, executed, claimed, verified, tx success) ·
  `warning` (wrong network, no wallet, RPC down, ready-to-execute) · `error`
  (hash mismatch, tx failure, config error) · `info` (claimable,
  executable-at-date) · `neutral` (ended, cancelled, starts/unlocks dates).
- **Never hand-roll colored boxes** like
  `border-amber-500/40 bg-amber-500/10 text-amber-300` (or the emerald/rose
  equivalents). That pattern was removed platform-wide on 2026-08-06.
- Exception: transient inline/field-level error *text* stays plain
  `text-rose-400` (matches `Field`'s error line) — text only, never a box.

### Form fields — `Field` from `components/ui/Input.tsx`

Character requirements render top-right next to the label via the `counter`
(live count), `range` ("min–max"), and `counterMet` (min reached → counter
turns `signal-400`) props. Don't repeat the numbers in the `hint` below the
field. Limits come from their single source of truth (e.g. `JOURNEY_LIMITS` in
`lib/journey.ts`) — never inline new constants.

## Workflow

- `CHANGELOG.local.md` (gitignored, repo root): append an entry for completed
  plan work; read it at session start for current state. Newest entries first.
- `/launch` and `/agents` are URL-only pages — intentionally unlinked from nav.
