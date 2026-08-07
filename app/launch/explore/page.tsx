import { redirect } from "next/navigation";

/**
 * The explore surface moved into the public nav: /tokens (deployed tokens +
 * token designs) and /projects. This URL-only page now just forwards,
 * preserving old ?view= links.
 */
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  redirect(view === "projects" ? "/projects" : "/tokens");
}
