"use client";

import { useState } from "react";

import { DraftControl, type DraftMeta } from "@/components/build/DraftControl";
import { TextField } from "@/components/ideation/TextField";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { SelectField } from "@/components/ui/Select";
import { BRAND_BODY_FONTS, BRAND_DISPLAY_FONTS } from "@/content/brand-fonts";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftBrandPrompt } from "@/lib/agent-prompts-draft";
import type { AgentWriteMode } from "@/lib/agent-writes";
import { BRAND_LIMITS, type Brand, DEFAULT_BRAND, PALETTE_KEYS, type PaletteKey, contrastRatio } from "@/lib/brand/record";
import { BANNER_KINDS, type BannerKind } from "@/lib/brand/banner";
import type { ProjectDoc } from "@/lib/ideation";
import { listFromText } from "@/lib/icp";

/**
 * The brand kit on Decisions (M118): four swatches with contrast lines,
 * the two fonts, tone words, the tagline, Pick from the logo, Draft the
 * kit, and the banner downloads. Facts and warnings are plain text.
 */
export function BrandEditor({
  projectId,
  name,
  meta,
  patch,
  agentMode,
  brand,
  hasLogo,
  onChange,
}: {
  projectId: string;
  name: string;
  meta: DraftMeta;
  patch: (p: Partial<ProjectDoc>) => void;
  agentMode: AgentWriteMode;
  brand: Brand | undefined;
  hasLogo: boolean;
  onChange: (next: Brand) => void;
}) {
  const C = STUDIO_PLUS_COPY.brand;
  const current = brand ?? DEFAULT_BRAND;
  const [found, setFound] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const setPalette = (k: PaletteKey, v: string) => onChange({ ...current, palette: { ...current.palette, [k]: v.toLowerCase() } });

  const pick = async () => {
    setPicking(true);
    setPickError(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/brand/palette`, { method: "POST" });
      const body = (await res.json()) as { hexes?: string[]; error?: string };
      if (!res.ok || !body.hexes) {
        setPickError(body.error ?? C.none);
        return;
      }
      setFound(body.hexes);
      const [primary, secondary, accent] = body.hexes;
      onChange({ ...current, palette: { ...current.palette, primary: primary ?? current.palette.primary, secondary: secondary ?? current.palette.secondary, accent: accent ?? current.palette.accent } });
    } finally {
      setPicking(false);
    }
  };

  const contrast = (k: Exclude<PaletteKey, "surface">) => contrastRatio(current.palette[k], current.palette.surface);

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      {!brand ? <p className="text-xs text-ink-500">{C.none}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <DraftControl<Brand>
          projectId={projectId}
          doc={meta}
          patch={patch}
          agentMode={agentMode}
          kind="brand"
          body={{ hexes: found }}
          label={C.draft}
          onResult={(v) => onChange(v)}
          agentPrompt={draftBrandPrompt(name, projectId)}
        />
        <Button size="sm" variant="outline" onClick={() => void pick()} disabled={picking || !hasLogo} title={hasLogo ? C.pickHint : C.pickHint}>
          {picking ? C.picking : C.pick}
        </Button>
      </div>
      {pickError ? <p className="text-xs text-rose-400">{pickError}</p> : null}
      {found.length ? (
        <div className="space-y-1">
          <p className="text-xs text-ink-400">{C.found}</p>
          <div className="flex flex-wrap gap-2">
            {found.map((h) => (
              <button key={h} type="button" onClick={() => setPalette("primary", h)} className="flex items-center gap-1.5 rounded-md border border-ink-700/60 px-2 py-1 text-[11px] text-ink-300 hover:bg-ink-800/60">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: h }} /> {h}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-200">{C.palette}</p>
        <div className="grid gap-3 sm:grid-cols-4">
          {PALETTE_KEYS.map((k) => (
            <Field key={k} label={C.swatches[k]}>
              <div className="flex items-center gap-2">
                <input type="color" value={current.palette[k]} onChange={(e) => setPalette(k, e.target.value)} aria-label={C.swatches[k]} className="h-9 w-9 cursor-pointer rounded-md border border-ink-700/60 bg-ink-900 p-0.5" />
                <Input value={current.palette[k]} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && setPalette(k, e.target.value)} className="font-mono text-xs" maxLength={7} />
              </div>
            </Field>
          ))}
        </div>
        <ul className="space-y-0.5 text-[11px] text-ink-500">
          {(["primary", "secondary", "accent"] as const).map((k) => {
            const r = contrast(k);
            return (
              <li key={k} className={r < 4.5 ? "text-rose-400" : undefined}>
                {C.contrast(C.swatches[k], r.toFixed(1))}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label={C.display} value={current.fonts.display} onChange={(v) => onChange({ ...current, fonts: { ...current.fonts, display: v } })} options={BRAND_DISPLAY_FONTS.map((f) => ({ value: f, label: f }))} />
        <SelectField label={C.body} value={current.fonts.body} onChange={(v) => onChange({ ...current, fonts: { ...current.fonts, body: v } })} options={BRAND_BODY_FONTS.map((f) => ({ value: f, label: f }))} />
      </div>
      <Field label={C.tone} hint={C.toneHint}>
        <Input defaultValue={current.tone.join(", ")} onBlur={(e) => onChange({ ...current, tone: listFromText(e.target.value).slice(0, BRAND_LIMITS.tone.max).map((t) => t.slice(0, BRAND_LIMITS.tone.item)) })} placeholder="plain, precise, calm" />
      </Field>
      <TextField label={C.tagline} value={current.tagline ?? ""} onChange={(v) => onChange({ ...current, tagline: v })} max={BRAND_LIMITS.tagline.max} />
      {brand ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-ink-200">{C.banners}</p>
          <p className="text-[11px] text-ink-500">{C.bannersHint}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            {(Object.keys(BANNER_KINDS) as BannerKind[]).map((k) => (
              <a key={k} href={`/api/ideation/projects/${projectId}/brand/banner?kind=${k}`} download className="text-ink-200 hover:underline">
                {C.banner[k]} ({BANNER_KINDS[k].w} by {BANNER_KINDS[k].h})
              </a>
            ))}
            <a href={`/api/export/project/${projectId}?file=brand`} download className="text-ink-200 hover:underline" title={C.fileHint}>
              {C.file}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
