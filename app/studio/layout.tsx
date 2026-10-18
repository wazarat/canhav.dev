import { CommandMenu } from "@/components/studio/CommandMenu";
import { NewProjectModal } from "@/components/studio/new/NewProjectModal";
import { imagesConfigured } from "@/lib/images";

/** The studio shell (M87): every studio page gets the command menu and the new project pop up. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandMenu />
      <NewProjectModal logoUploads={imagesConfigured()} />
    </>
  );
}
