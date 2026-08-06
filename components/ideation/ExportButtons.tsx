/**
 * Export downloads on the public pages. Plain anchors — the route gates on a
 * Clerk account (free; the gate is email capture) and bounces signed-out
 * visitors through /studio sign-in and back to the file.
 */
export function ExportButtons({ kind, slug }: { kind: "p" | "t"; slug: string }) {
  const base = `/api/export/${kind}/${slug}`;
  const cls =
    "inline-flex items-center rounded-full border border-ink-700/70 px-3 py-1 text-xs font-medium text-ink-300 transition-colors hover:border-electric-500/50 hover:text-electric-200";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={base} className={cls} download>
        Export design doc (.md)
      </a>
      <a href={`${base}?file=agents`} className={cls} download>
        Export AGENTS.md
      </a>
      <span className="text-[11px] text-ink-600">Free — sign-in required</span>
    </div>
  );
}
