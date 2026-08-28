import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Features/Pricing/etc. are sections on the single homepage, not real
  // pages — these rewrites let the nav link to clean paths (/pricing)
  // instead of hash anchors (/#pricing) while still serving the homepage's
  // content. src/app/page.tsx scrolls to the matching section on load.
  async rewrites() {
    return [
      { source: "/features", destination: "/" },
      { source: "/pricing", destination: "/" },
    ];
  },
};

export default nextConfig;
