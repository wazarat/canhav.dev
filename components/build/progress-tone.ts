/**
 * The milestone bar's colour (M175, the owner's call): from the start
 * colour through yellow to bright green by percent, never red. An ease-in
 * keeps it quiet early and makes the change more pronounced near done.
 * The three colours are theme tokens in app/globals.css, mixed in oklab
 * so the path never swings through another hue.
 */
export function progressFill(done: number, total: number): string {
  const p = total > 0 ? Math.min(done, total) / total : 0;
  const t = p ** 1.6;
  const mix = (from: string, to: string, share: number) => `color-mix(in oklab, rgb(var(--${to})) ${Math.round(share * 100)}%, rgb(var(--${from})))`;
  return t < 0.5 ? mix("progress-start", "progress-mid", t * 2) : mix("progress-mid", "progress-end", (t - 0.5) * 2);
}
