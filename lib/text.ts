/**
 * Text helpers shared by the record normalizers and the draft kinds
 * (M141). Pure.
 */

/**
 * Cut `text` to at most `max` characters without ending inside a word.
 * Unchanged when it fits, so it is idempotent. Otherwise the slice steps
 * back to the last whitespace past sixty percent of `max`, and trailing
 * whitespace and loose punctuation are trimmed; when no whitespace sits in
 * that window the hard slice stands.
 */
export function cutAtWord(text: string, max: number): string {
  if (max <= 0) return "";
  if (text.length <= max) return text;
  const hard = text.slice(0, max);
  const floor = Math.floor(max * 0.6);
  const space = hard.search(/\s\S*$/);
  const cut = space > floor ? hard.slice(0, space) : hard;
  return cut.replace(/[\s,;:(\[{"'\-–]+$/u, "");
}
