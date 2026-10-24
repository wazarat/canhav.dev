import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { AppClerkProvider } from "@/components/layout/AppClerkProvider";
import { PlanProvider } from "@/components/studio/PlanProvider";
import { Background } from "@/components/layout/Background";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { THEME_COLOR } from "@/lib/theme-constants";
import { SITE } from "@/content/site";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const SHARE_TITLE = `${SITE.name} · ${SITE.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  // Browser tabs show only the site name; share cards keep the descriptive title.
  title: SITE.name,
  description: SITE.description,
  openGraph: {
    title: SHARE_TITLE,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SITE.description,
  },
  keywords: [
    "tokenization",
    "stablecoins",
    "defi",
    "crypto research",
    "capital markets",
    "canhav",
  ],
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light }, // copy-ok, a media query
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark }, // copy-ok, a media query
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Dark is the server class on every route so marketing stays static;
    // ThemeScript swaps it before paint (light once signed in, M146), hence
    // the hydration warning suppression on this one element (M73).
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${mono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <ThemeScript />
        <AppClerkProvider>
          <PlanProvider>
            <Background />
            <div className="relative flex min-h-screen flex-col">
              <Nav />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </PlanProvider>
        </AppClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
