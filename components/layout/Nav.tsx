import Link from "next/link";

import { WaitlistCta } from "@/components/home/WaitlistCta";
import { Logo } from "@/components/ui/Logo";
import { SITE } from "@/content/site";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/60 bg-ink-950/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="flex items-center gap-6" aria-label="Primary">
            <Link
              href={SITE.docsUrl}
              className="text-sm font-medium text-ink-300 transition-colors hover:text-ink-50"
            >
              Docs
            </Link>
          </nav>
        </div>
        <WaitlistCta label="Join waitlist" size="sm" sourcePage="nav" />
      </div>
    </header>
  );
}
