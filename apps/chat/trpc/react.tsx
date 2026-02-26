"use client";

import {
  isServer,
  type QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import dynamic from "next/dynamic";
import { useState } from "react";
import SuperJSON from "superjson";
import type { AppRouter } from "@/trpc/routers/_app";
import { makeQueryClient } from "./query-client";

// Conditionally load devtools - disabled by default due to Turbopack HMR issues
// Set NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS=true in .env.local to enable
// See: https://github.com/TanStack/query/issues/8159
const shouldEnableDevtools =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_ENABLE_QUERY_DEVTOOLS === "true";

const ReactQueryDevtools = shouldEnableDevtools
  ? dynamic(
      () =>
        import("@tanstack/react-query-devtools").then(
          (mod) => mod.ReactQueryDevtools
        ),
      { ssr: false }
    )
  : () => null;

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

const publicBaseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL?.replace(/\/$/, "");

function getUrl() {
  if (typeof window !== "undefined") {
    return "/api/trpc";
  }
  if (publicBaseUrl) {
    return `${publicBaseUrl}/api/trpc`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/trpc`;
  }
  return "http://localhost:3000/api/trpc";
}
export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchLink({
          url: getUrl(),
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
          transformer: SuperJSON,
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        {props.children}
      </TRPCProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
