import Link from "next/link";

import { EXPLORE_COPY, type ExploreView } from "@/content/launch";
import { cn } from "@/lib/utils";

/**
 * The Explore board's view toggle (M49). Two links, so the choice lives in
 * the URL (?view=projects), survives a reload and can be shared, and the
 * page stays a server component. Tokens is the default and keeps the bare
 * /explore path.
 */
export function ExploreToggle({ view }: { view: ExploreView }) {
  return (
    <nav
      aria-label={EXPLORE_COPY.toggleLabel}
      className="inline-flex gap-1 rounded-full border border-ink-800/70 p-0.5 text-sm"
    >
      {EXPLORE_COPY.views.map((v) => (
        <Link
          key={v.value}
          href={v.value === "tokens" ? "/explore" : `/explore?view=${v.value}`}
          aria-current={view === v.value ? "page" : undefined}
          scroll={false}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            view === v.value ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:text-ink-200",
          )}
        >
          {v.label}
        </Link>
      ))}
    </nav>
  );
}
