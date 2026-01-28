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
  webpack: (config, { isServer }) => {
    // Add rule to handle .node files (native modules)
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Externalize native modules for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@napi-rs/canvas');
    }

    return config;
  },
};

export default nextConfig;
