import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  transpilePackages: ["@ai-models/vercel-gateway"],
  experimental: {
    optimizePackageImports: [
      "react-tweet",
      "echarts-for-react",
      "@lobehub/icons",
    ],
    // Enable external packages for server components to allow pino transports
  },
  // PPR (Partial Prerendering) configuration moved to cacheComponents in Next.js 16
  cacheComponents: true,
  serverExternalPackages: ["pino", "pino-pretty"],
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        pathname: "**",
      },
      {
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
