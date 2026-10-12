import { Segmented } from "@/components/ui/Segmented";
import { EXPLORE_COPY, type ExploreView } from "@/content/launch";

/**
 * The Explore board's view toggle (M49). Two links, so the choice lives in
 * the URL (?view=projects), survives a reload and can be shared, and the
 * page stays a server component. Tokens is the default and keeps the bare
 * /explore path. A segmented control since M74.
 */
export function ExploreToggle({ view }: { view: ExploreView }) {
  return (
    <nav aria-label={EXPLORE_COPY.toggleLabel}>
      <Segmented
        value={view}
        options={EXPLORE_COPY.views.map((v) => ({
          value: v.value,
          label: v.label,
          href: v.value === "tokens" ? "/explore" : `/explore?view=${v.value}`,
        }))}
      />
    </nav>
  );
}
