/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi's tempo connector optionally imports the "accounts" SDK with a
    // turbopack-only optional marker; alias it to an empty module so webpack
    // (dev and build) skips it — the runtime .catch handles its absence.
    config.resolve.alias = { ...config.resolve.alias, accounts: false };
    return config;
  },
};

export default nextConfig;
