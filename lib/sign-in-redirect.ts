/**
 * Where to send an account that is already signed in but reached the
 * sign-in page with ?redirect_url=. Clerk's SignIn component follows that
 * parameter on its own, but only while it is mounted, and a signed-in
 * account never mounts it: the studio page renders the home instead and the
 * parameter is lost. Two callers set it. The export gate sends a same-origin
 * path. Clerk's OAuth authorize endpoint sends the consent screen on the
 * Account Portal (accounts.<root domain>) when an MCP client signs in, so
 * dropping it leaves the agent waiting on a sign-in that never finishes.
 *
 * Accepted: a path on this origin, or an https URL on the site's root domain
 * or one of its subdomains, derived from the request host (www.canhav.com
 * allows canhav.com, accounts.canhav.com and clerk.canhav.com). Anything
 * else returns null and the visitor stays on the studio home.
 */
export function signInRedirectTarget(raw: unknown, host: string): string | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 4096) return null;
  if (raw.startsWith("/")) return raw.startsWith("//") || raw.startsWith("/\\") ? null : raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const root = host.replace(/:\d+$/, "").replace(/^www\./, "").toLowerCase();
  if (!root || !root.includes(".")) return null;
  const target = url.hostname.toLowerCase();
  return target === root || target.endsWith(`.${root}`) ? url.href : null;
}
