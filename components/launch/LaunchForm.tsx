"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field, Input, TextArea, inputClasses } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  LAUNCH_COPY,
  LAUNCH_FORM,
  validateDescription,
  validateName,
  validateTicker,
  validateWebsite,
  validateXHandle,
} from "@/content/launch";

import { ImagePicker } from "./ImagePicker";
import { TokenPreviewCard } from "./TokenPreviewCard";

type ImageState = { file: File; previewUrl: string } | null;

export function LaunchForm() {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [description, setDescription] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [website, setWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState<string | undefined>(undefined);
  const [image, setImage] = useState<ImageState>(null);

  // Revoke the object URL when the image changes or the form unmounts.
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = image?.previewUrl ?? null;
  }, [image]);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function selectImage(file: File) {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  }

  function clearImage() {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  const nameError = validateName(name);
  const tickerError = validateTicker(ticker);
  const descriptionError = validateDescription(description);
  const xHandleError = validateXHandle(xHandle);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="glass space-y-5 rounded-2xl border border-ink-700/70 p-6 md:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Name"
            required
            error={nameError}
            hint={LAUNCH_FORM.name.hint}
            counter={`${name.length}/${LAUNCH_FORM.name.max}`}
          >
            <Input
              value={name}
              maxLength={LAUNCH_FORM.name.max}
              placeholder="Token name"
              onChange={(e) =>
                setName(e.target.value.replace(LAUNCH_FORM.name.strip, ""))
              }
            />
          </Field>

          <Field
            label="Ticker"
            required
            error={tickerError}
            hint={LAUNCH_FORM.ticker.hint}
            counter={`${ticker.length}/${LAUNCH_FORM.ticker.max}`}
          >
            <Input
              value={ticker}
              maxLength={LAUNCH_FORM.ticker.max}
              placeholder="SYMBOL"
              className="font-mono uppercase"
              onChange={(e) =>
                setTicker(
                  e.target.value.toUpperCase().replace(LAUNCH_FORM.ticker.strip, ""),
                )
              }
            />
          </Field>
        </div>

        <Field
          label="Description"
          error={descriptionError}
          hint={LAUNCH_FORM.description.hint}
          counter={`${description.length}/${LAUNCH_FORM.description.max}`}
        >
          <TextArea
            value={description}
            maxLength={LAUNCH_FORM.description.max}
            rows={4}
            placeholder="A short description of the token"
            className="resize-none"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <ImagePicker
          previewUrl={image?.previewUrl ?? null}
          fileName={image?.file.name ?? null}
          onSelect={selectImage}
          onClear={clearImage}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="X profile" error={xHandleError}>
            <div
              className={cn(
                inputClasses,
                "flex items-center gap-0 px-0 py-0 focus-within:border-electric-500/60 focus-within:ring-1 focus-within:ring-electric-500/30",
              )}
            >
              <span className="pl-3.5 text-sm text-ink-500">
                {LAUNCH_FORM.xHandle.prefix}
              </span>
              <input
                value={xHandle}
                maxLength={LAUNCH_FORM.xHandle.max}
                placeholder="handle"
                className="w-full bg-transparent py-2.5 pr-3.5 text-sm text-ink-50 placeholder:text-ink-500 focus:outline-none"
                onChange={(e) =>
                  setXHandle(e.target.value.replace(LAUNCH_FORM.xHandle.strip, ""))
                }
              />
            </div>
          </Field>

          <Field label="Website" error={websiteError} hint={LAUNCH_FORM.website.hint}>
            <Input
              type="url"
              value={website}
              placeholder="https://example.com"
              onChange={(e) => {
                setWebsite(e.target.value);
                if (websiteError) setWebsiteError(validateWebsite(e.target.value.trim()));
              }}
              onBlur={() => setWebsiteError(validateWebsite(website.trim()))}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-ink-800/70 pt-5">
          <Button type="submit" disabled>
            {LAUNCH_COPY.submitDisabled}
          </Button>
          <p className="text-xs text-ink-500">{LAUNCH_COPY.footnote}</p>
        </div>
      </form>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <TokenPreviewCard
          name={name}
          ticker={ticker}
          description={description}
          imageUrl={image?.previewUrl ?? null}
          xHandle={xHandle}
          website={websiteError ? "" : website.trim()}
        />
      </div>
    </div>
  );
}
