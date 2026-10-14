"use client";

import { useState } from "react";

import { ImagePicker } from "@/components/launch/ImagePicker";
import { Field } from "@/components/ui/Input";
import { LOGO_COPY } from "@/content/ideation";
import { validateImageFile } from "@/content/launch";

/**
 * The logo on a project or a token design (M90). Picks a file, uploads it to
 * the content-addressed image store and stores the URL on the doc; the
 * agent's set_logo lands on the same field. Clearing drops the key.
 */
export function LogoField({
  value,
  onChange,
  hint,
}: {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  hint: string;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-image", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? LOGO_COPY.failed);
      onChange(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : LOGO_COPY.failed);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Field label={LOGO_COPY.label} info={hint} error={error ?? undefined}>
      <ImagePicker
        previewUrl={value ?? null}
        fileName={value ? (working ? LOGO_COPY.uploading : LOGO_COPY.fileName) : working ? LOGO_COPY.uploading : null}
        onSelect={(file) => void select(file)}
        onClear={() => onChange(undefined)}
      />
    </Field>
  );
}
