import type { NextConfig } from "next";

const MODEL_REGISTRY_URL = "airegistry.app";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,

  transpilePackages: ["@airegistry/vercel-gateway"],
  experimental: {
    turbopackFileSystemCacheForDev: true,
    optimizePackageImports: [
      "react-tweet",
      "echarts-for-react",
      "@lobehub/icons",
      "lucide-react",
      "@phosphor-icons/react",
    ],
  },
  // TODO: Uncomment this when we can exclude /api/cron/cleanup from caching selectively
  // cacheComponents: true,
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
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  redirects: async () => [
    {
      source: "/models",
      destination: `https://${MODEL_REGISTRY_URL}`,
      permanent: true,
    },
    {
      source: "/models/:path*",
      destination: `https://${MODEL_REGISTRY_URL}/models/:path*`,
      permanent: true,
    },
    {
      source: "/compare",
      destination: `https://${MODEL_REGISTRY_URL}/compare`,
      permanent: true,
    },
    {
      source: "/compare/:path*",
      destination: `https://${MODEL_REGISTRY_URL}/compare/:path*`,
      permanent: true,
    },
  ],
};

export default nextConfig;
