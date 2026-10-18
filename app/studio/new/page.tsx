import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { NEW_PROJECT_COPY } from "@/content/studio-new";
import { getSessionUser, isAuthConfigured } from "@/lib/auth";
import { NEW_PROJECT_PARAM } from "@/lib/new-project";

/**
 * The new project flow is a pop up on the studio pages (M91 follow up).
 * This route is the deep link to it: signed in it lands on the studio home
 * with the pop up open, signed out it goes through the sign in card and
 * comes back here.
 */
export const metadata: Metadata = {
  title: NEW_PROJECT_COPY.title,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  if (!isAuthConfigured()) redirect("/studio");
  const user = await getSessionUser();
  if (!user) redirect("/studio?redirect_url=/studio/new");
  redirect(`/studio?${NEW_PROJECT_PARAM}=1`);
}
