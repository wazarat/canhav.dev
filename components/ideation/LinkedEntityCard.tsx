import Link from "next/link";

/**
 * The cross-reference card between a linked project and token design: name,
 * type, one line, link — and deliberately nothing else. Credibility signals
 * stay scoped to their own entity; this card references, never restates.
 */
export function LinkedEntityCard({
  type,
  name,
  slug,
  summary,
}: {
  type: "project" | "token_design";
  name: string;
  slug: string;
  summary: string;
}) {
  const href = type === "project" ? `/p/${slug}` : `/t/${slug}`;
  return (
    <Link
      href={href}
      className="card-surface card-lift block rounded-2xl border border-ink-700/70 p-5"
    >
      <p className="text-[11px] uppercase tracking-wide text-ink-500">
        {type === "project" ? "Linked project" : "Linked token design"}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-ink-50">{name}</p>
      {summary && <p className="mt-1 line-clamp-2 text-sm text-ink-400">{summary}</p>}
      <p className="mt-2 text-xs text-electric-300">{href} →</p>
    </Link>
  );
}
