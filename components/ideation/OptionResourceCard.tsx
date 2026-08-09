import { StatusChip } from "@/components/ui/StatusChip";
import {
  FIELD_INTROS,
  FIELD_RESOURCES,
  type OptionResource,
  type ResourceFieldKey,
  type ResourceIntroKey,
} from "@/content/ideation-resources";

/**
 * The one renderer for contextual resources: teaching copy plus an optional
 * deployability note. Content lives in content/ideation-resources.ts; adding
 * a resource there needs no component change. Server-renderable.
 */
export function ResourceCard({ resource }: { resource: OptionResource }) {
  const d = resource.deployability;
  return (
    <div className="space-y-2">
      <StatusChip tone="info" variant="block">
        {resource.title && (
          <span className="block font-medium text-ink-100">{resource.title}</span>
        )}
        <span className={resource.title ? "mt-1 block" : "block"}>{resource.body}</span>
        {resource.example && (
          <span className="mt-2 block text-ink-400">{resource.example}</span>
        )}
        {resource.links && resource.links.length > 0 && (
          <span className="mt-2 block">
            {resource.links.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-electric-300 transition-colors hover:text-electric-200"
              >
                {l.label}
                {i < resource.links!.length - 1 ? " · " : ""}
              </a>
            ))}
          </span>
        )}
      </StatusChip>
      {d && (
        <StatusChip tone={d.tier === "custom" ? "warning" : "neutral"} variant="block">
          {d.text}
        </StatusChip>
      )}
    </div>
  );
}

/** Resource for the currently selected option of a field, or nothing. */
export function OptionResourceCard({
  field,
  value,
}: {
  field: ResourceFieldKey;
  value: string;
}) {
  if (!value) return null;
  const r = (FIELD_RESOURCES[field] as Record<string, OptionResource>)[value];
  return r ? <ResourceCard resource={r} /> : null;
}

/** Field-level intro (explains a phrase or frames a question). */
export function FieldIntroCard({ intro }: { intro: ResourceIntroKey }) {
  return <ResourceCard resource={FIELD_INTROS[intro]} />;
}
