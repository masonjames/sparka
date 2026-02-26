import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Required for Docker/Dokploy deployment
  typedRoutes: true,
  experimental: {
    optimizePackageImports: [
      "react-tweet",
      "echarts-for-react",
      "lucide-react",
    ],
  },
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
      {
        // R2 assets domain
        hostname: "assets.chat.masonjames.com",
      },
      { hostname: "www.google.com" },
      {
        hostname: "models.dev",
      },
    ],
  },
};

export default nextConfig;
