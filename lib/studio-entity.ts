/**
 * The record the studio has open (M92), for the nav switcher. The nav is a
 * server component above the studio layout, so a React context cannot
 * reach it; this is the same React-free registry pattern as
 * lib/command-menu.ts. An editor sets the entity from an effect as the
 * name is typed and clears it on unmount; the switcher subscribes with
 * useSyncExternalStore. Null on every page that is not an editor.
 */

export type StudioEntityKind = "project" | "token_design";

export interface StudioEntity {
  kind: StudioEntityKind;
  id: string;
  name: string;
}

type Listener = () => void;

let current: StudioEntity | null = null;
const listeners = new Set<Listener>();

export function setStudioEntity(entity: StudioEntity | null): void {
  current = entity;
  for (const l of listeners) l();
}

export function currentStudioEntity(): StudioEntity | null {
  return current;
}

export function subscribeStudioEntity(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The editor routes, for the fallback before an editor's effect has fired. */
export function studioEntityFromPath(pathname: string): Pick<StudioEntity, "kind" | "id"> | null {
  const m = /^\/studio\/(project|token)\/([0-9a-f-]{36})(?:\/|$)/.exec(pathname);
  if (!m) return null;
  return { kind: m[1] === "project" ? "project" : "token_design", id: m[2] };
}

/** True on the studio home and every page under it. */
export function isStudioPath(pathname: string): boolean {
  return pathname === "/studio" || pathname.startsWith("/studio/");
}
