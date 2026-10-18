"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { STUDIO_ROUTES as ROUTES, useStudioRecords } from "@/components/studio/useStudioRecords";
import { inputClasses } from "@/components/ui/Input";
import { useModalBehavior } from "@/components/ui/useModalBehavior";
import { STUDIO_COPY } from "@/content/ideation";
import {
  type Command,
  OPEN_COMMAND_MENU_EVENT,
  filterCommands,
  isCommandMenuShortcut,
  registeredCommands,
  subscribeCommands,
} from "@/lib/command-menu";
import { openNewProject } from "@/lib/new-project";
import { cn } from "@/lib/utils";

/**
 * The studio command menu (M87), after Linear's Cmd K. Opens on Cmd K (Ctrl
 * K elsewhere) or the header hint anywhere under /studio. Static commands
 * create a draft or go to a page; the owner's projects and designs load on
 * every open (useStudioRecords, shared with the nav switcher since M92);
 * pages register their own commands through lib/command-menu.
 * One input, a grouped list, arrow keys and Enter. No dependency.
 */
export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { records, loading } = useStudioRecords(open);
  const [notice, setNotice] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Command[]>(() => registeredCommands());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const C = STUDIO_COPY.command;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    setNotice(null);
  }, []);

  useModalBehavior({ onClose: close, containerRef, active: open });

  // A page registers its commands from an effect that may run before this
  // menu subscribes (children mount first), so the registry is read again
  // on subscribe and on every open, not only on change.
  useEffect(() => {
    setRegistered(registeredCommands());
    return subscribeCommands(() => setRegistered(registeredCommands()));
  }, []);
  useEffect(() => {
    if (open) setRegistered(registeredCommands());
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isCommandMenuShortcut(e)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_MENU_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_MENU_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function createDraft(kind: keyof typeof ROUTES) {
    const res = await fetch(ROUTES[kind].api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return;
    const body = (await res.json()) as { id: string };
    router.push(`${ROUTES[kind].editor}/${body.id}`);
  }

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => router.push(href);
    const fixed: Command[] = [
      { id: "new:project", label: C.newProject, group: C.groups.create, hint: C.newProjectHint, keywords: "create", run: openNewProject },
      { id: "new:design", label: C.newDesign, group: C.groups.create, hint: C.newDesignHint, keywords: "create token", run: () => createDraft("token") },
      ...registered.filter((c) => c.group === C.groups.project),
      { id: "go:studio", label: C.studio, group: C.groups.go, run: go("/studio") },
      { id: "go:launches", label: C.launches, group: C.groups.go, run: go("/studio/launches") },
      { id: "go:templates", label: C.templates, group: C.groups.go, run: go("/studio/templates") },
      { id: "go:explore", label: C.explore, group: C.groups.go, run: go("/explore") },
      { id: "go:launch", label: C.launch, group: C.groups.go, keywords: "token curve", run: go("/launch") },
      ...registered.filter((c) => c.group !== C.groups.project),
      ...(records?.projects ?? []).map((r) => ({
        id: `open:project:${r.id}`,
        label: C.openProject(r.draft_doc.name ?? ""),
        group: C.groups.open,
        keywords: "project open",
        run: go(`${ROUTES.project.editor}/${r.id}`),
      })),
      ...(records?.designs ?? []).map((r) => ({
        id: `open:design:${r.id}`,
        label: C.openDesign(r.draft_doc.name ?? ""),
        group: C.groups.open,
        keywords: "token design open",
        run: go(`${ROUTES.token.editor}/${r.id}`),
      })),
    ];
    return fixed;
    // createDraft and router are stable for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registered, records, C]);

  const visible = useMemo(() => filterCommands(commands, query), [commands, query]);

  useEffect(() => {
    setActive(0);
  }, [query, visible.length]);

  async function run(c: Command) {
    const result = c.run();
    if (c.id === "project:copy-mcp") {
      await result;
      setNotice(C.copied);
      setTimeout(close, 700);
      return;
    }
    close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, visible.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = visible[active];
      if (c) void run(c);
    }
  }

  if (!open) return null;

  const groups: string[] = [];
  for (const c of visible) if (!groups.includes(c.group)) groups.push(c.group);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={C.title} className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink-950/80" onClick={close} />
      <div
        ref={containerRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-ink-700/70 bg-ink-900"
      >
        <div className="flex items-center gap-2 border-b border-ink-800/70 px-3">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-ink-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={C.placeholder}
            aria-label={C.title}
            aria-activedescendant={visible[active] ? `cmd-${visible[active].id}` : undefined}
            className={cn(inputClasses, "border-0 bg-transparent px-0 py-3 focus:ring-0")}
          />
          <kbd className="hidden rounded-md border border-ink-700/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-500 sm:block">esc</kbd>
        </div>
        <div role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {notice ? <p className="px-4 py-2 text-xs text-signal-400">{notice}</p> : null}
          {loading && !visible.length ? <p className="px-4 py-2 text-xs text-ink-500">{C.loading}</p> : null}
          {!visible.length && !loading ? <p className="px-4 py-2 text-xs text-ink-500">{C.empty}</p> : null}
          {groups.map((group) => (
            <div key={group} className="px-2 pb-1">
              <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-ink-500">{group}</p>
              {visible
                .filter((c) => c.group === group)
                .map((c) => {
                  const i = visible.indexOf(c);
                  return (
                    <button
                      key={c.id}
                      id={`cmd-${c.id}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => void run(c)}
                      className={cn(
                        "flex w-full flex-col items-start rounded-lg px-2 py-1.5 text-left transition-colors",
                        i === active ? "bg-ink-800/70 text-ink-50" : "text-ink-200 hover:bg-ink-800/40",
                      )}
                    >
                      <span className="text-sm">{c.label}</span>
                      {c.hint ? <span className="text-[11px] text-ink-500">{c.hint}</span> : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
