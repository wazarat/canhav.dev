import "server-only";

/**
 * Custom domains for public pages (M127, Studio+): a host the team owns,
 * added to the Vercel project over the REST API, verified by DNS, then
 * routed by the middleware to the project's page. Pure helpers at the
 * top, the Vercel calls below. Unconfigured (no token) means every call
 * answers configured false and the studio says so.
 */
export const DOMAIN_LIMITS = { max: 253 } as const;

const RESERVED = ["canhav.com", "www.canhav.com", "meet.canhav.com", "docs.canhav.com", "localhost"];

/** Lowercase host without scheme, path or port; null when not a host, reserved or a Vercel host. */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, "").split("/")[0].split("?")[0].split(":")[0]; // copy-ok, a port separator
  if (host.endsWith(".")) host = host.slice(0, -1);
  if (!host || host.length > DOMAIN_LIMITS.max) return null;
  if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return null;
  if (RESERVED.includes(host) || host.endsWith(".canhav.com") || host.endsWith(".vercel.app")) return null;
  return host;
}

export function isApex(host: string): boolean {
  return host.split(".").length === 2;
}

/** What the team sets at their DNS host. */
export interface DnsRecord {
  type: "A" | "CNAME" | "TXT";
  name: string;
  value: string;
}

export function dnsRecordsFor(host: string, txt: string | null): DnsRecord[] {
  const out: DnsRecord[] = isApex(host) ? [{ type: "A", name: "@", value: "76.76.21.21" }] : [{ type: "CNAME", name: host.split(".")[0], value: "cname.vercel-dns.com" }];
  if (txt) out.push({ type: "TXT", name: "_vercel", value: txt });
  return out;
}

export interface DomainStatus {
  configured: boolean;
  domain: string | null;
  /** Vercel has verified ownership. */
  verified: boolean;
  /** DNS does not point at Vercel yet. */
  misconfigured: boolean;
  records: DnsRecord[];
  error?: string;
}

function env() {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;
  const team = process.env.VERCEL_TEAM_ID;
  return token && project ? { token, project, team } : null;
}

async function vercel(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const e = env();
  if (!e) return { ok: false, status: 0, body: {} };
  const url = new URL(`https://api.vercel.com${path}`);
  if (e.team) url.searchParams.set("teamId", e.team);
  try {
    const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${e.token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: { message: (err as Error).message } } };
  }
}

function errorText(body: Record<string, unknown>): string {
  const e = body.error as { message?: string; code?: string } | undefined;
  return e?.message ?? e?.code ?? "Vercel did not accept the request.";
}

export function domainsConfigured(): boolean {
  return env() !== null;
}

/** Add the host to the Vercel project; a host already on it is fine. */
export async function addDomain(host: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const e = env();
  if (!e) return { ok: false, message: "Custom domains are not configured on this deployment." };
  const res = await vercel(`/v10/projects/${e.project}/domains`, { method: "POST", body: JSON.stringify({ name: host }) });
  if (res.ok) return { ok: true };
  const code = (res.body.error as { code?: string } | undefined)?.code;
  if (code === "domain_already_in_use" || code === "domain_already_exists") return { ok: true };
  return { ok: false, message: errorText(res.body) };
}

export async function removeDomain(host: string): Promise<boolean> {
  const e = env();
  if (!e) return false;
  const res = await vercel(`/v9/projects/${e.project}/domains/${encodeURIComponent(host)}`, { method: "DELETE" });
  return res.ok || res.status === 404;
}

/** Ownership and DNS state from Vercel, with the records still to set. */
export async function domainStatus(host: string | null): Promise<DomainStatus> {
  const e = env();
  if (!host) return { configured: e !== null, domain: null, verified: false, misconfigured: false, records: [] };
  if (!e) return { configured: false, domain: host, verified: false, misconfigured: false, records: dnsRecordsFor(host, null) };
  const [info, config] = await Promise.all([vercel(`/v9/projects/${e.project}/domains/${encodeURIComponent(host)}`), vercel(`/v6/domains/${encodeURIComponent(host)}/config`)]);
  if (!info.ok) return { configured: true, domain: host, verified: false, misconfigured: true, records: dnsRecordsFor(host, null), error: errorText(info.body) };
  const verified = Boolean(info.body.verified);
  const verification = Array.isArray(info.body.verification) ? (info.body.verification as Array<{ type?: string; domain?: string; value?: string }>) : [];
  const txt = verification.find((v) => v.type === "TXT")?.value ?? null;
  const misconfigured = config.ok ? Boolean(config.body.misconfigured) : true;
  if (!verified) await vercel(`/v9/projects/${e.project}/domains/${encodeURIComponent(host)}/verify`, { method: "POST" });
  return { configured: true, domain: host, verified, misconfigured, records: dnsRecordsFor(host, verified ? null : txt) };
}
