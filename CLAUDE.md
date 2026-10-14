# canhav.dev — internal conventions

Next.js app router + Tailwind 3.4. Dark is the default theme and a light theme
(the ponsfamily.com canvas, M73) switches from the nav toggle. Palette is the
custom `ink` scale plus `electric` (blue), `neon` (violet), `signal` (cyan)
accents from `tailwind.config.ts`; every colour is a CSS variable triplet in
`app/globals.css` (`:root` dark, `html.light` light), so the same utility class
works in both modes and the ink scale inverts (ink-950 is always the page,
ink-50 the strongest text). Never hard code a hex or rgba in tsx for a surface
or text colour; SVG fills use `fill-ink-*` classes. A `light:` variant exists
for the rare exception. Tailwind config edits need a dev server restart.
`cn()` (clsx + tailwind-merge) lives in `lib/utils.ts`.

## UI conventions

### Flat controls (M74)

Surfaces are flat: a hairline border on the ink-900 surface, no blur, no
glow, no gradients. Radii settle at `rounded-md` for chips and badges,
`rounded-lg` for buttons, inputs and rows, `rounded-xl` for cards. Pills
(`rounded-full`) are only for dots, progress bars and the nav Soon badge.
Build on the primitives in `components/ui` instead of inline surface
classes:

- `Card` and `CardSection` (`Card.tsx`) for any panel; sections divide one
  card the thirdweb way. `.glass` still exists for old call sites and
  renders the same flat surface; do not use it in new code.
- `Select` and `SelectField` (`Select.tsx`) for every native select, with
  `optionClasses` on the options.
- `Segmented` and `SegmentedField` (`Segmented.tsx`) for two to four
  exclusive options: chain, project mode, steppers, view toggles and
  tablists (`role="tablist"`). Options with `href` render as links.
- `ChoiceCardGroups` (`ChoiceCard.tsx`) for full width choice rows
  (sectors, subsectors). `ChipMultiSelect` and `ChipRadioGroup` stay for
  short multi picks (shapes, verdicts, modes).
- `Menu` and `MenuItem` (`Menu.tsx`) for dropdowns, `InfoTip` for helper
  copy behind an info icon, `Collapsible` for "Learn more" rows.

### Status surfaces — always `StatusChip`

Every status pill, badge, or message box (network state, sale phase, tranche
state, tx success/error, callouts) uses `components/ui/StatusChip.tsx`: a
flat chip on a subtle ink fill with a hairline border and neutral `ink-200`
text, the **only** color is the small status dot.

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

## Chains

A project builds on one of two chains, `robinhood_testnet` or
`arbitrum_sepolia` (`lib/chains.ts`). `ProjectDoc.chain` is optional and never
injected, so read it with `projectChainOf()`; absent means Robinhood. A token
lives on its project's chain. Never reach for a single global chain:

- Launch config comes from `launchChain(chain)` in `content/launch.ts`. A chain
  with `live: false` has no contracts yet and every write path must refuse it.
- Indexer readers in `lib/indexer.ts` take the chain last. Use `findToken` or
  `findTokenRead` when only an address is known; the token carries its chain.
- Launch components take a required `chain` prop and call
  `useLaunchChain(chain)`; wagmi reads pass `chainId`.
- Kit environments are `KIT_ENVIRONMENTS[chain]`. A shape whose protocol is
  missing on the testnet gets a note, never a block.

## Workflow

- `CHANGELOG.local.md` (gitignored, repo root): append an entry for completed
  plan work; read it at session start for current state. Newest entries first.
- `/agents` is a URL-only page — intentionally unlinked from nav. `/launch` is the
  Launch tab since 2026-09-23 (Singapore buildathon M6). `/explore` is the Explore
  tab since 2026-09-24 (M15); it replaced `/projects`, which now redirects there
  along with the old `/launch/explore`. Since 2026-10-01 (M49) a toggle switches
  the board between Tokens (the default) and Projects (`?view=projects`, where
  `/projects` lands). The two audience callouts from the old
  page live on in `components/home/BuildWithUsCards.tsx`, rendered at the bottom
  of `/explore`.
