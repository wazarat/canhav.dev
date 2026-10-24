import { Activity, Boxes, Coins, Gem, Handshake, HeartHandshake, Megaphone, Receipt, Users } from "lucide-react";

import { CANVAS_LAYOUT, type CanvasBlock } from "@/lib/canvas";
import { cn } from "@/lib/utils";

/** One small icon per block (M155), top right of its card. */
export const CANVAS_ICONS: Record<CanvasBlock, typeof Users> = {
  keyPartners: Handshake,
  keyActivities: Activity,
  keyResources: Boxes,
  valueProposition: Gem,
  customerRelationships: HeartHandshake,
  channels: Megaphone,
  customerSegments: Users,
  costStructure: Receipt,
  revenueStreams: Coins,
};

/**
 * The classic Business Model Canvas arrangement (M155): a ten column grid
 * on md and up (partners, value proposition and segments full height,
 * activities over resources, relationships over channels, cost and
 * revenue as the bottom band), one column of cards in reading order on a
 * phone. Shared by the editor and the public page; the caller renders
 * each block.
 */
export function CanvasGrid({ render, className }: { render: (block: CanvasBlock, placement: string) => React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 md:grid-cols-10 md:auto-rows-fr", className)}>{CANVAS_LAYOUT.map(({ block, className: placement }) => render(block, placement))}</div>;
}

/** A block card's frame: title row with the icon, then the body. Flat ink surface, hairline border (M74). */
export function CanvasBlockFrame({
  block,
  title,
  action,
  className,
  children,
  onOpen,
}: {
  block: CanvasBlock;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  /** When set, the body is clickable and opens the block for editing. */
  onOpen?: () => void;
}) {
  const Icon = CANVAS_ICONS[block];
  return (
    <section className={cn("flex min-h-[8rem] flex-col rounded-xl border border-ink-700/60 bg-ink-900 p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-300">{title}</h3>
        <span className="flex shrink-0 items-center gap-2">
          {action}
          <Icon aria-hidden className="h-3.5 w-3.5 text-ink-500" />
        </span>
      </div>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="mt-2 flex-1 rounded-md text-left outline-none ring-electric-400/40 focus-visible:ring-2">
          {children}
        </button>
      ) : (
        <div className="mt-2 flex-1">{children}</div>
      )}
    </section>
  );
}

/** The items of a block as short lines (M155); read only. */
export function CanvasItemsList({ items, empty }: { items: ReadonlyArray<{ id: string; text: string }> | undefined; empty: string }) {
  if (!items?.length) return <p className="text-xs text-ink-500">{empty}</p>;
  return (
    <ul className="space-y-1">
      {items.map((i) => (
        <li key={i.id} className="text-sm leading-snug text-ink-200">
          {i.text}
        </li>
      ))}
    </ul>
  );
}
