import { Suspense } from "react";

import { CommandMenu } from "@/components/studio/CommandMenu";
import { NewProjectModal } from "@/components/studio/new/NewProjectModal";
import { imagesConfigured } from "@/lib/images";

/**
 * The studio shell (M87): every studio page gets the command menu and the
 * new project pop up. The pop up reads the URL (useSearchParams), so it
 * sits in a Suspense boundary or the statically prerendered studio pages
 * (/studio/templates) fail the build.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandMenu />
      <Suspense fallback={null}>
        <NewProjectModal logoUploads={imagesConfigured()} />
      </Suspense>
    </>
  );
}
