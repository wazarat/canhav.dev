import "server-only";

import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";

import { isAuthConfigured } from "@/lib/auth";
import { orgIdsForUser } from "@/lib/mcp/membership";
import { isProjectKey, verifyKey } from "@/lib/project-keys";

/**
 * Shared OAuth wiring for every MCP mount. Clerk reports the protected
 * resource as the origin, not the path, so the one metadata route below is
 * correct for /mcp and for every project-scoped /mcp/p/[id] endpoint.
 */
export const MCP_RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource/mcp";

/**
 * The project server's verifier (M111): a chk_ project key first, then the
 * Clerk OAuth token. A key speaks for the account that made it and the
 * project's team, with its scope and project on the auth info so the
 * register seam and withProject can refuse a write on a read key and a
 * key used on another project. The shared server keeps verifyMcpToken and
 * ignores keys.
 */
export async function verifyProjectMcpToken(req: Request, token?: string) {
  if (isProjectKey(token)) {
    const key = await verifyKey(token);
    if (!key) return undefined;
    return {
      token,
      clientId: "project-key",
      scopes: [`project:${key.scope}`],
      extra: { userId: key.owner.userId, orgIds: key.owner.orgIds, keyScope: key.scope, keyProjectId: key.projectId, keyId: key.keyId },
    };
  }
  return verifyMcpToken(req, token);
}

export async function verifyMcpToken(_req: Request, token?: string) {
  if (!isAuthConfigured() || !token) return undefined;
  try {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    const info = await verifyClerkToken(clerkAuth, token);
    if (!info) return info;
    // The caller's teams ride along (M107), so a project moved to a team
    // opens for every member's agent.
    const userId = (info.extra as { userId?: unknown } | undefined)?.userId;
    const orgIds = typeof userId === "string" ? await orgIdsForUser(userId) : [];
    return { ...info, extra: { ...(info.extra ?? {}), orgIds } };
  } catch {
    return undefined;
  }
}
