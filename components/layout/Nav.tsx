import Link from "next/link";

import { NavAuthButton } from "@/components/layout/NavAuthButton";
import { StudioBreadcrumb } from "@/components/layout/StudioBreadcrumb";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { SoonBadge } from "@/components/ui/SoonBadge";
import { NAV_LINKS } from "@/content/site";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/40 bg-ink-950/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Logo compact />
          <StudioBreadcrumb />
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-6">
          <nav className="flex items-center gap-3 sm:gap-6" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink-300 transition-colors hover:text-ink-50"
              >
                {link.label}
                {link.soon && <SoonBadge label="Soon" />}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <NavAuthButton />
        </div>
      </div>
    </header>
  );
}
