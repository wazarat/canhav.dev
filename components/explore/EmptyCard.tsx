export function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-ink-700/70 p-8 text-center">
      <p className="text-sm text-ink-300">{children}</p>
    </div>
  );
}
