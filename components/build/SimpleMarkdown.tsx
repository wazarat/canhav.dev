/**
 * The few markdown shapes the drafts use (M126): headings, bullets and
 * paragraphs, rendered without a markdown library. Server and client safe.
 */
export function SimpleMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.every((l) => /^[-*] /.test(l.trim())))
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-200">
              {lines.map((l, j) => (
                <li key={j}>{l.trim().replace(/^[-*] /, "")}</li>
              ))}
            </ul>
          );
        const h = lines[0].match(/^(#{1,3}) (.+)$/);
        if (h && lines.length === 1) {
          const level = h[1].length;
          const cls = level === 1 ? "font-display text-xl font-semibold text-ink-50" : level === 2 ? "font-display text-base font-semibold text-ink-50" : "text-sm font-semibold text-ink-100";
          return (
            <p key={i} className={cls}>
              {h[2]}
            </p>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-ink-200">
            {lines.join(" ")}
          </p>
        );
      })}
    </div>
  );
}
