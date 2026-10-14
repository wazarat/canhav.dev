import { CommandMenu } from "@/components/studio/CommandMenu";

/** The studio shell (M87): every studio page gets the command menu. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandMenu />
    </>
  );
}
