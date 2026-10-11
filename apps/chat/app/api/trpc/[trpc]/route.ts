import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

/* oxlint-disable typescript/promise-function-async -- deep-readonly conversion changes assignability at its SDK/public API boundary and needs an ownership-contract migration.
typescript/promise-function-async (#606): handler preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections. */

const handler = (req: ReadonlyNativeSurface<Request>): Promise<Response> =>
  fetchRequestHandler({
    createContext: createTRPCContext,
    endpoint: "/api/trpc",
    req,
    router: appRouter,
  });
/* oxlint-enable typescript/promise-function-async */

export { handler as GET, handler as POST };
