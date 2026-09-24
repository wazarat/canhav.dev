/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /projects and /launch/explore both became /explore in the buildathon M15.
  // Temporary while the event runs, so the old paths can come back cheaply.
  async redirects() {
    return [
      { source: "/projects", destination: "/explore", permanent: false },
      { source: "/launch/explore", destination: "/explore", permanent: false },
    ];
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
