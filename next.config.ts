import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Removed to enable SSR/API Routes
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
