/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /projects and /launch/explore both became /explore in the buildathon M15.
  // Temporary while the event runs, so the old paths can come back cheaply.
  async redirects() {
    return [
      { source: "/projects", destination: "/explore?view=projects", permanent: false },
      { source: "/launch/explore", destination: "/explore", permanent: false },
      // The waitlist closed when sign-up opened to everyone.
      { source: "/waitlist", destination: "/sign-up", permanent: true },
      // The Tokens tab became the Studio Pro page, reached from the studio (2026-10-09).
      { source: "/tokens", destination: "/studiopro", permanent: true },
    ];
  },
  // meet.canhav.com is the booking page. Every path on that host renders
  // /meet, so the Google Calendar embed lives on a canhav address. It has to
  // run beforeFiles: "/" matches the landing page, and an afterFiles rewrite
  // never gets a turn once a page has matched.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "meet.canhav.com" }],
          destination: "/meet",
        },
        // Any other page path too, but never /_next, /api or a file (anything
        // with a dot), or the stylesheet and scripts would come back as HTML.
        {
          source: "/:path((?!_next/|api/|.*\\..*).+)",
          has: [{ type: "host", value: "meet.canhav.com" }],
          destination: "/meet",
        },
      ],
    };
  },
  webpack: (config) => {
    // wagmi's tempo connector optionally imports the "accounts" SDK with a
    // turbopack-only optional marker; alias it to an empty module so webpack
    // (dev and build) skips it — the runtime .catch handles its absence.
    config.resolve.alias = { ...config.resolve.alias, accounts: false };
    return config;
  },
};

export default nextConfig;
