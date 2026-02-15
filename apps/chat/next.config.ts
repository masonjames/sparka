import type { NextConfig } from "next";

const MODEL_REGISTRY_URL = "airegistry.app";

const nextConfig: NextConfig = {
  typedRoutes: true,
  cacheComponents: true,

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
        hostname: "*.public.blob.vercel-storage.com",
      },
      { hostname: "www.google.com" },
      {
        hostname: "models.dev",
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
