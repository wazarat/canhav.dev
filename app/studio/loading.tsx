import { cardClasses } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * The studio's loading boundary (2026-10-21). Every studio page is
 * rendered on request and the home waits on Clerk, Neon and the indexers
 * before it can answer, so without this file a click on the Studio button
 * sat on the old page until the whole render was done. With it the URL
 * changes at once and this skeleton holds the page's shape: the header
 * block, the start card, then a few list rows. Generic on purpose, since
 * it also covers the project, token and launches routes.
 */
function Bar({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-800", className)} />;
}

export default function StudioLoading() {
  return (
    <div className="container py-14 md:py-20" role="status" aria-busy="true">
      <span className="sr-only">Loading the studio</span>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-4">
          <Bar className="h-3 w-16" />
          <Bar className="h-10 w-64 md:h-12 md:w-80" />
          <Bar className="h-4 w-full max-w-md" />
        </div>
        <div className="flex gap-2">
          <Bar className="h-8 w-24 rounded-lg" />
          <Bar className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="mt-10 space-y-10">
        <div className={cn(cardClasses, "p-5")}>
          <Bar className="h-5 w-40" />
          <Bar className="mt-3 h-4 w-full max-w-lg" />
          <Bar className="mt-6 h-9 w-32 rounded-lg" />
        </div>
        <div className="space-y-3">
          <Bar className="h-5 w-32" />
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(cardClasses, "flex items-center justify-between gap-4 p-4")}>
              <div className="space-y-2">
                <Bar className="h-4 w-48" />
                <Bar className="h-3 w-32" />
              </div>
              <Bar className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
