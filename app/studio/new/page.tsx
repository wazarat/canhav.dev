import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NewProjectWizard } from "@/components/studio/new/NewProjectWizard";
import { NEW_PROJECT_COPY } from "@/content/studio-new";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import { imagesConfigured } from "@/lib/images";

/**
 * The new project flow (M91): name, sector, chain and one line, logo and
 * token, then one POST that creates the project and opens it. A route
 * rather than a modal so the switcher, the command menu and the track card
 * can all link here and a reload keeps the page. Unlinked from navigation
 * like every studio page.
 */
export const metadata: Metadata = {
  title: NEW_PROJECT_COPY.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  if (!isAuthConfigured()) redirect("/studio");
  const user = await getSessionUser();
  // The studio home's sign in card follows redirect_url back here.
  if (!user) redirect("/studio?redirect_url=/studio/new");
  return <NewProjectWizard logoUploads={imagesConfigured()} />;
}
