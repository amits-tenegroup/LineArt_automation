import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.mynamenecklace.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.limeandlou.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
