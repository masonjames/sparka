import path from "node:path";
import type { NextConfig } from "next";

const MODEL_REGISTRY_URL = "airegistry.app";
const ASYNC_HOOKS_STUB = path.resolve(import.meta.dirname, "stubs/async_hooks.js");

const nextConfig: NextConfig = {
  typedRoutes: true,

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
  turbopack: {
    root: import.meta.dirname,
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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        async_hooks: false,
        "node:async_hooks": false,
      };
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        async_hooks: ASYNC_HOOKS_STUB,
        "node:async_hooks": ASYNC_HOOKS_STUB,
      };
    }
    return config;
  },
};

export default nextConfig;
