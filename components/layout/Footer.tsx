import { SITE } from "@/content/site";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-ink-800/60 bg-ink-950/60">
      <div className="container flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-center">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-md text-sm text-ink-300">{SITE.footerBlurb}</p>
        </div>
        <div className="text-xs text-ink-400">
          <p>{SITE.footerDataLine}</p>
          <p className="mt-1">
            © {new Date().getFullYear()} CanHav. {SITE.footerLegal}
          </p>
        </div>
      </div>
    </footer>
  );
}
