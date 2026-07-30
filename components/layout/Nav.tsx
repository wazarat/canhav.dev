import { WaitlistCta } from "@/components/home/WaitlistCta";
import { Logo } from "@/components/ui/Logo";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/60 bg-ink-950/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Logo />
        <WaitlistCta label="Join waitlist" size="sm" sourcePage="nav" />
      </div>
    </header>
  );
}
