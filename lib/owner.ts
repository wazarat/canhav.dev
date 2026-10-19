/**
 * Who may see and change a record (M107). A record belongs to the Clerk
 * account that made it (owner_id) and, once moved to a team, to a Clerk
 * organization (org_id) whose every member may open it. An Owner is the
 * caller's side of that check: the account plus the organizations the call
 * speaks for. A session carries its active organization only (Clerk's
 * switcher model); an MCP call carries every membership. Pure.
 */
export interface Owner {
  userId: string;
  /** Organization ids the caller may act for. Empty for a personal session. */
  orgIds: string[];
}

/** A row with the two ownership columns. org_id is absent on rows read before the column existed. */
export interface OwnedRow {
  owner_id: string;
  org_id?: string | null;
}

/** The personal owner, no organizations. */
export function personalOwner(userId: string): Owner {
  return { userId, orgIds: [] };
}

/** True when the owner may see the row: made it, or a member of the team it belongs to. */
export function ownedBy(row: OwnedRow, owner: Owner | null | undefined): boolean {
  if (!owner) return false;
  if (row.owner_id === owner.userId) return true;
  return Boolean(row.org_id) && owner.orgIds.includes(row.org_id as string);
}

/**
 * The owner a record itself stands for, the account that made it plus its
 * team. Used when a server writes a record on behalf of whoever already
 * passed the ownership check, so sub rows stay keyed to the record.
 */
export function ownerOf(row: OwnedRow): Owner {
  return { userId: row.owner_id, orgIds: row.org_id ? [row.org_id] : [] };
}
