"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { WaitlistModal } from "@/components/home/WaitlistModal";

export function WaitlistCta({
  label = "Join the waitlist",
  variant = "primary",
  size = "md",
  className,
  sourcePage,
  withArrow = false,
}: {
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Kept for lead attribution once the form is wired to a backend. */
  sourcePage: string;
  withArrow?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
        {withArrow && (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        )}
      </Button>
      <WaitlistModal open={open} onClose={() => setOpen(false)} sourcePage={sourcePage} />
    </>
  );
}
