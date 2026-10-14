/**
 * A token reference as a person or an agent types it (M89): the full
 * address, the short form the studio shows (0x1234…abcd, with any of the
 * three dots forms), or the token page URL. Pure, shared by the studio
 * paste field and the MCP link tools.
 */

export type LaunchRef =
  | { kind: "address"; address: string }
  | { kind: "short"; head: string; tail: string };

const FULL = /^0x[0-9a-f]{40}$/;
const SHORT = /^(0x[0-9a-f]{2,12})(?:…|\.{3}|\.{2})([0-9a-f]{3,12})$/;
const URL_PATH = /\/launch\/t\/(0x[0-9a-f]{40})(?:[/?#]|$)/;

export function parseLaunchRef(raw: string): LaunchRef | null {
  const text = raw.trim().toLowerCase().replace(/^\$/, "");
  if (!text) return null;
  const url = text.match(URL_PATH);
  if (url) return { kind: "address", address: url[1] };
  if (FULL.test(text)) return { kind: "address", address: text };
  const short = text.match(SHORT);
  if (short) return { kind: "short", head: short[1], tail: short[2] };
  return null;
}

export type LaunchRefMatch<T> =
  | { status: "one"; launch: T }
  | { status: "none" }
  | { status: "many"; launches: T[] };

/** The launch a reference names among a list, by full address or by head and tail. */
export function matchLaunchRef<T extends { token_address: string }>(ref: LaunchRef, launches: readonly T[]): LaunchRefMatch<T> {
  const hits = launches.filter((l) => {
    const a = l.token_address.toLowerCase();
    return ref.kind === "address" ? a === ref.address : a.startsWith(ref.head) && a.endsWith(ref.tail);
  });
  if (hits.length === 1) return { status: "one", launch: hits[0] };
  if (hits.length === 0) return { status: "none" };
  return { status: "many", launches: hits };
}

/** The short form the studio shows, 0x1234…abcd. */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** What a reference could not be read as, for an error line. */
export const LAUNCH_REF_HINT =
  "a full 0x address, the short form the studio shows (0x1234…abcd) or the token page link (canhav.com/launch/t/0x…)";
