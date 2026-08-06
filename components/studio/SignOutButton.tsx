"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  if (!supabase) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await supabase.auth.signOut();
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
