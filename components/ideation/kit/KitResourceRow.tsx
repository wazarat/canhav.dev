"use client";

import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { CheckItem } from "@/components/ui/CheckItem";
import { StatusChip } from "@/components/ui/StatusChip";
import { FAMILY_LABELS, FLAG_COPY, KIND_LABELS, RAIL_COPY } from "@/content/kits/copy";
import type { KitResource } from "@/lib/kits";

const KIND_TONE = {
  skill: "neon",
  spec: "electric",
  repo: "signal",
} as const;

/** One resource in the rail: checkbox, title link, badges, flags, our reason. */
export function KitResourceRow({
  resource,
  checked,
  onToggle,
  rank,
}: {
  resource: KitResource;
  checked: boolean;
  onToggle: () => void;
  /** 1-based position among the pack's core items, shown as "Read 1st". */
  rank?: number;
}) {
  const r = resource;
  const kindTone = (KIND_TONE as Partial<Record<KitResource["kind"], "neon" | "electric" | "signal">>)[r.kind] ?? "neutral";
  return (
    <CheckItem
      checked={checked}
      onChange={onToggle}
      label={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a
            href={r.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-medium text-ink-50 transition-colors hover:text-electric-400"
          >
            {r.title}
            <ExternalLink aria-hidden className="h-3 w-3 text-ink-500" />
          </a>
          {rank !== undefined ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-signal-400">
              {RAIL_COPY.readFirst(rank)}
            </span>
          ) : null}
        </span>
      }
      description={
        <span className="block space-y-1.5">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge tone={kindTone} className="px-2 py-0 text-[10px]">
              {KIND_LABELS[r.kind]}
            </Badge>
            <Badge className="px-2 py-0 text-[10px]">{FAMILY_LABELS[r.family]}</Badge>
            {(r.flags ?? []).map((f) => (
              <StatusChip key={f} tone={FLAG_COPY[f].tone} className="px-2 py-0 text-[10px]">
                {FLAG_COPY[f].label}
              </StatusChip>
            ))}
          </span>
          <span className="block">{r.why}</span>
        </span>
      }
    />
  );
}
