import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";

import { AppClerkProvider } from "@/components/layout/AppClerkProvider";
import { Background } from "@/components/layout/Background";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
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
  title: {
    default: SHARE_TITLE,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "arbitrum",
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
  themeColor: "#05060A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} dark`}>
      <body className="min-h-screen antialiased">
        <AppClerkProvider>
          <Background />
          <div className="relative flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AppClerkProvider>
      </body>
    </html>
  );
}
