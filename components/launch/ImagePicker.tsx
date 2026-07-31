"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { LAUNCH_FORM, validateImageFile } from "@/content/launch";

/**
 * Local-only image picker: validates type/size and hands the parent an object
 * URL for preview. The file never leaves the browser — no upload, no IPFS yet.
 * The parent owns the object URL lifecycle (creation happens here, revocation
 * in the parent's cleanup) so the preview survives this component unmounting.
 */
export function ImagePicker({
  previewUrl,
  fileName,
  onSelect,
  onClear,
}: {
  previewUrl: string | null;
  fileName: string | null;
  onSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateImageFile(file);
    setError(problem);
    if (!problem) onSelect(file);
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-ink-200">Token image</span>

      <input
        ref={inputRef}
        type="file"
        accept={LAUNCH_FORM.image.types.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          // Allow re-selecting the same file after a clear.
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-ink-700/60 bg-ink-950/70 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected token"
            className="h-12 w-12 rounded-lg border border-ink-700/60 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-ink-100">{fileName}</p>
            <p className="text-xs text-ink-500">Preview only — not uploaded.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(undefined);
              onClear();
            }}
            aria-label="Remove image"
            className="rounded-lg border border-ink-700 bg-ink-900/60 p-1.5 text-ink-300 transition-colors hover:text-ink-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-ink-700/70 bg-ink-950/50 px-4 py-6 text-sm text-ink-300 transition-colors hover:border-electric-500/50 hover:text-ink-100"
        >
          <ImagePlus className="h-5 w-5 text-ink-500" />
          <span>
            Choose an image
            <span className="ml-2 text-xs text-ink-500">{LAUNCH_FORM.image.hint}</span>
          </span>
        </button>
      )}

      {error ? <span className="block text-xs text-rose-400">{error}</span> : null}
    </div>
  );
}
