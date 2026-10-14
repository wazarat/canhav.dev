/**
 * The studio command menu registry (M87), after Linear's Cmd K. Pages and
 * editors register the commands that only make sense where they are (go to
 * a step, copy this project's MCP command) and remove them when they
 * unmount; the menu reads the registry when it opens. Client only, no
 * React, so any component can register from an effect.
 */

export interface Command {
  /** Unique across sources. */
  id: string;
  label: string;
  /** The group heading the menu shows it under. */
  group: string;
  /** A short line under the label. */
  hint?: string;
  /** Extra words the filter matches. */
  keywords?: string;
  run: () => void | Promise<void>;
}

type Listener = () => void;

const sources = new Map<string, Command[]>();
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

/** Register a source's commands. Returns the function that removes them. */
export function registerCommands(source: string, commands: Command[]): () => void {
  sources.set(source, commands);
  notify();
  return () => {
    if (sources.get(source) === commands) {
      sources.delete(source);
      notify();
    }
  };
}

/** Every registered command, source registration order. */
export function registeredCommands(): Command[] {
  return [...sources.values()].flat();
}

export function subscribeCommands(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Window event that opens the menu, for the header hint and any button. */
export const OPEN_COMMAND_MENU_EVENT = "canhav:command-menu";

export function openCommandMenu(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_COMMAND_MENU_EVENT));
}

/** True when the key event is the menu shortcut, Cmd K on a Mac and Ctrl K elsewhere. */
export function isCommandMenuShortcut(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";
}

/** Case insensitive filter on label, hint, group and keywords; every word of the query must match. */
export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...commands];
  return commands.filter((c) => {
    const hay = `${c.label} ${c.hint ?? ""} ${c.group} ${c.keywords ?? ""}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
