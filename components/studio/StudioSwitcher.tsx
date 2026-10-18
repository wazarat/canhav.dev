"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronDown, Plus } from "lucide-react";

import { STUDIO_ROUTES, useStudioRecords } from "@/components/studio/useStudioRecords";
import { Button } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { STUDIO_COPY } from "@/content/ideation";
import {
  type StudioEntity,
  currentStudioEntity,
  studioEntityFromPath,
  subscribeStudioEntity,
} from "@/lib/studio-entity";
import { openNewProject } from "@/lib/new-project";
import { cn } from "@/lib/utils";

/**
 * The plan the account is on. Only "studio" exists today; "studio_plus"
 * renders the plus in the brand gradient once a paid tier ships. The
 * three tiers are the free Studio, Studio+ (monthly) and Studio Pro
 * (contact), and nothing stores a plan yet.
 */
export type StudioPlan = "studio" | "studio_plus";

const serverSnapshot = (): StudioEntity | null => null;

/**
 * The top right of the nav on studio routes (M92): "Studio" or
 * "Studio / <name>" with a menu of the account's projects and token
 * designs, the current one marked, plus New project and Studio home. The
 * name follows the editor as it is typed through lib/studio-entity.
 */
export function StudioSwitcher({
  plan = "studio",
  variant = "button",
}: {
  plan?: StudioPlan;
  /** "breadcrumb" renders "/ Studio / <name>" after the logo, the name carrying the menu (2026-10-18). */
  variant?: "button" | "breadcrumb";
}) {
  const C = STUDIO_COPY.switcher;
  const router = useRouter();
  const pathname = usePathname();
  const live = useSyncExternalStore(subscribeStudioEntity, currentStudioEntity, serverSnapshot);
  // The route names the record before the editor's effect fires; the store carries the live name.
  const fromPath = studioEntityFromPath(pathname);
  const current = live ?? (fromPath ? { ...fromPath, name: "" } : null);
  const name = current ? current.name.trim() || C.untitled : null;
  const studioWord = (
    <>
      {C.studio}
      {plan === "studio_plus" ? <span className="text-gradient-brand">{C.plus}</span> : null}
    </>
  );
  const items = <SwitcherItems current={current} go={(href) => router.push(href)} />;

  if (variant === "breadcrumb") {
    const sep = (
      <span aria-hidden className="text-ink-600">
        /
      </span>
    );
    const triggerClass =
      "inline-flex max-w-[12rem] items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-ink-50 transition-colors hover:bg-ink-800/60";
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        {sep}
        {name ? (
          <>
            <Link href="/studio" className="hidden shrink-0 text-sm font-medium text-ink-300 transition-colors hover:text-ink-50 sm:inline">
              {studioWord}
            </Link>
            <span className="hidden sm:inline">{sep}</span>
            <Menu
              align="left"
              width="w-72"
              trigger={({ open, toggle }) => (
                <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={C.open} className={triggerClass}>
                  <span className="truncate">{name}</span>
                  <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform", open && "rotate-180")} />
                </button>
              )}
            >
              {items}
            </Menu>
          </>
        ) : (
          <Menu
            align="left"
            width="w-72"
            trigger={({ open, toggle }) => (
              <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={C.open} className={triggerClass}>
                {studioWord}
                <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform", open && "rotate-180")} />
              </button>
            )}
          >
            {items}
          </Menu>
        )}
      </div>
    );
  }

  return (
    <Menu
      width="w-72"
      trigger={({ open, toggle }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={C.open}
          className="max-w-[14rem] gap-1.5"
        >
          <span className={cn("shrink-0", name && "hidden sm:inline")}>{studioWord}</span>
          {name ? (
            <>
              <span aria-hidden className="hidden text-ink-500 sm:inline">
                /
              </span>
              <span className="truncate">{name}</span>
            </>
          ) : null}
          <ChevronDown aria-hidden className={cn("h-3.5 w-3.5 shrink-0 text-ink-500 transition-transform", open && "rotate-180")} />
        </Button>
      )}
    >
      {/* The panel mounts only while the menu is open, so the records load on every open. */}
      {items}
    </Menu>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-500">{children}</p>;
}

function SwitcherItems({ current, go }: { current: StudioEntity | null; go: (href: string) => void }) {
  const C = STUDIO_COPY.switcher;
  const { records, loading } = useStudioRecords(true);
  const row = (kind: "project" | "token_design", r: { id: string; draft_doc: { name?: string } }) => {
    const isCurrent = current?.kind === kind && current.id === r.id;
    const href = `${kind === "project" ? STUDIO_ROUTES.project.editor : STUDIO_ROUTES.token.editor}/${r.id}`;
    return (
      <MenuItem key={`${kind}:${r.id}`} onSelect={() => go(href)} className={cn(isCurrent && "text-ink-50")}>
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
          {isCurrent ? <Check aria-hidden className="h-3.5 w-3.5 text-signal-400" /> : null}
        </span>
        <span className="truncate">{r.draft_doc.name?.trim() || C.untitled}</span>
        {isCurrent ? <span className="sr-only">{C.current}</span> : null}
      </MenuItem>
    );
  };
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {!records && loading ? (
        <p className="px-3.5 py-2.5 text-sm text-ink-500">{C.loading}</p>
      ) : (
        <>
          <Heading>{C.projects}</Heading>
          {records?.projects.length ? (
            records.projects.map((r) => row("project", r))
          ) : (
            <p className="px-3.5 py-2 text-sm text-ink-500">{C.empty}</p>
          )}
          <Heading>{C.designs}</Heading>
          {records?.designs.length ? (
            records.designs.map((r) => row("token_design", r))
          ) : (
            <p className="px-3.5 py-2 text-sm text-ink-500">{C.empty}</p>
          )}
        </>
      )}
      <div className="my-1 border-t border-ink-700/40" />
      <MenuItem onSelect={openNewProject}>
        <Plus aria-hidden className="h-3.5 w-3.5 text-ink-500" />
        {C.newProject}
      </MenuItem>
      <MenuItem onSelect={() => go("/studio")}>
        <span className="h-3.5 w-3.5" />
        {C.home}
      </MenuItem>
    </div>
  );
}
