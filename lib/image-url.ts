/** True for a URL on CanHav's own image store, the only logo a doc accepts (M90). Pure. */
export function isStoredImageUrl(url: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/launchpad\/[A-Za-z0-9/_.-]+$/.test(url);
}

export const LOGO_LIMITS = { max: 300 } as const;
