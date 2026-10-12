import { KIT_CATALOG } from "@/content/kits/catalog";
import { sectionsFor } from "@/content/kits/checklists";
import { shapeLabel } from "@/content/kits/copy";
import { TEMPLATE_CATALOG, templateById } from "@/content/templates";
import { projectChainOf } from "@/lib/chains";
import type { ProjectDoc } from "@/lib/ideation";
import { type ProductShape, type ProjectKit, kitShapes, packFor } from "@/lib/kits";
import { templatesForShapes } from "@/lib/templates";

/**
 * How the chosen shapes overlap (M68 follow-up): what each shape brings on
 * its own and what two or more of them share, over the research pack, the
 * build steps and the contract templates. Pure over the document, for the
 * shapes dialog in the editor.
 */
export interface ShapeOverlap {
  shapes: Array<{
    shape: ProductShape;
    label: string;
    /** Items no other chosen shape carries. */
    only: { resources: number; steps: number; templates: number };
    total: { resources: number; steps: number; templates: number };
  }>;
  shared: {
    resources: number;
    steps: Array<{ key: string; title: string; shapes: ProductShape[] }>;
    templates: Array<{ id: string; name: string; shapes: ProductShape[] }>;
  };
}

export function shapeOverlap(doc: ProjectDoc): ShapeOverlap | null {
  const kit = doc.kit;
  const shapes = kitShapes(kit);
  if (!kit || !shapes.length) return null;
  const chain = projectChainOf(doc);
  // Steps come from the combined sections, where a step shared between shapes is one group with every member.
  const allGroups = sectionsFor(shapes, kit).flatMap((s) => s.groups);
  const per = shapes.map((shape) => {
    const one: ProjectKit = { ...kit, shape, shapes: [shape] };
    return {
      shape,
      resources: new Set(packFor(KIT_CATALOG, one, doc).map((r) => r.id)),
      steps: new Set(allGroups.filter((g) => g.shapes.includes(shape)).map((g) => g.key)),
      templates: new Set(templatesForShapes(TEMPLATE_CATALOG, [shape], chain).map((t) => t.id)),
    };
  });
  const count = (key: "resources" | "steps" | "templates") => {
    const seen = new Map<string, ProductShape[]>();
    for (const p of per) for (const id of p[key]) seen.set(id, [...(seen.get(id) ?? []), p.shape]);
    return seen;
  };
  const res = count("resources");
  const steps = count("steps");
  const tpls = count("templates");
  const onlyOf = (m: Map<string, ProductShape[]>, shape: ProductShape) =>
    [...m.entries()].filter(([, owners]) => owners.length === 1 && owners[0] === shape).length;
  const groups = new Map(allGroups.map((g) => [g.key, g] as const));
  return {
    shapes: per.map((p) => ({
      shape: p.shape,
      label: shapeLabel(p.shape) ?? p.shape,
      only: { resources: onlyOf(res, p.shape), steps: onlyOf(steps, p.shape), templates: onlyOf(tpls, p.shape) },
      total: { resources: p.resources.size, steps: p.steps.size, templates: p.templates.size },
    })),
    shared: {
      resources: [...res.values()].filter((o) => o.length > 1).length,
      steps: [...steps.entries()]
        .filter(([, o]) => o.length > 1)
        .map(([key, o]) => ({ key, title: groups.get(key)?.title ?? key, shapes: o })),
      templates: [...tpls.entries()]
        .filter(([, o]) => o.length > 1)
        .map(([id, o]) => ({ id, name: templateById(id)?.name ?? id, shapes: o })),
    },
  };
}
