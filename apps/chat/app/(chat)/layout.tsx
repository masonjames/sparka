import { cookies, headers } from "next/headers";
import React, { Suspense } from "react";

import { getChatModels } from "@/app/actions/get-chat-models";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatLoadingShell } from "@/components/chat-loading-shell";
import { EveDeletionProvider } from "@/components/eve/eve-deletion-provider";
import { EveRuntimeProvider } from "@/components/eve/eve-runtime-provider";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { AppModelId } from "@/lib/ai/app-model-id";
import { config } from "@/lib/config";
import { isPlaywrightTestEnvironment } from "@/lib/constants";
import { resolveEvePrincipal } from "@/lib/eve/principal";
import type { ReadonlyReactNode } from "@/lib/readonly-react-node";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";
import { ChatModelsProvider } from "@/providers/chat-models-provider";
import { DefaultModelProvider } from "@/providers/default-model-provider";
import { SessionProvider, SessionSeed } from "@/providers/session-provider";
import { preloadQuery } from "@/trpc/preload-query";
import { TRPCReactProvider } from "@/trpc/react";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";

import { auth } from "@/lib/auth";

const sidebarInsetClassName = "[--header-height:calc(var(--spacing)*13)]";
/* oxlint-disable typescript/strict-boolean-expressions -- ChatLayoutDynamic: max-lines-per-function: keep this cohesive render, state lifecycle, or integration scenario together; extraction needs a separate ownership decision; typescript/strict-boolean-expressions: the native session ID truthiness check intentionally rejects absent and empty IDs with one getter traversal; an explicit two-part guard raises native complexity above the pinned limit. unicorn/no-null: null is the existing React empty-render, ref, or API/cache sentinel; undefined has a different contract. */

const ChatLayoutDynamic = async ({
  children,
}: {
  readonly children: ReadonlyReactNode;
}): Promise<React.JSX.Element> => {
  const [cookieStore, headersRes, chatModels] = await Promise.all([
    cookies(),
    headers(),
    getChatModels(),
  ]);
  const session = isPlaywrightTestEnvironment
    ? null
    : await auth.api.getSession({ headers: headersRes });
  const principal = isPlaywrightTestEnvironment
    ? null
    : await resolveEvePrincipal(headersRes);

  const cookieModel = cookieStore.get("chat-model")?.value;
  const isAnonymous = !session?.user;

  const default_chat_model = config.ai.workflows.chat;
  let defaultModel: AppModelId = cookieModel ?? default_chat_model;

  if (typeof cookieModel === "string" && cookieModel !== "") {
    const modelExists = chatModels.some(
      (model: { readonly id: string }) => model.id === cookieModel
    );
    if (!modelExists) {
      defaultModel = default_chat_model;
    } else if (isAnonymous) {
      const anonymousModels: readonly AppModelId[] =
        ANONYMOUS_LIMITS.AVAILABLE_MODELS;
      const isModelAvailable = anonymousModels.includes(cookieModel);
      if (!isModelAvailable) {
        defaultModel = default_chat_model;
      }
    }
  }

  if (isAnonymous) {
    const anonymousModels: readonly AppModelId[] =
      ANONYMOUS_LIMITS.AVAILABLE_MODELS;
    if (!anonymousModels.includes(defaultModel)) {
      defaultModel = anonymousModels[0] ?? default_chat_model;
    }
  }

  if (session?.user?.id) {
    const queryClient = getQueryClient();
    // "Lazy prefetch": don't await; pending queries are dehydrated + streamed.

    // Preloading must swallow preload errors while pending queries are dehydrated and streamed.
    void preloadQuery(
      queryClient.query(trpc.settings.getModelPreferences.queryOptions())
    );

    // Preloading must swallow preload errors while pending queries are dehydrated and streamed.
    void preloadQuery(queryClient.query(trpc.project.list.queryOptions()));
  }

  return (
    <HydrateClient>
      <SessionSeed session={session} />

      <ChatModelsProvider models={chatModels}>
        <DefaultModelProvider defaultModel={defaultModel}>
          <KeyboardShortcuts />
          <EveRuntimeProvider
            key={principal?.ownerId ?? "anonymous"}
            ownerId={principal?.ownerId}
          >
            {children}
          </EveRuntimeProvider>
        </DefaultModelProvider>
      </ChatModelsProvider>
    </HydrateClient>
  );
};
/* oxlint-enable typescript/strict-boolean-expressions */

const ChatLayout = async ({
  children,
}: {
  readonly children: ReadonlyReactNode;
}): Promise<React.JSX.Element> => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const content = (
    <>
      <AppSidebar />
      <SidebarInset className={sidebarInsetClassName}>
        <Suspense fallback={<ChatLoadingShell />}>
          <ChatLayoutDynamic>{children}</ChatLayoutDynamic>
        </Suspense>
      </SidebarInset>
    </>
  );
  return (
    <TRPCReactProvider>
      <SessionProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <EveDeletionProvider>{content}</EveDeletionProvider>
        </SidebarProvider>
      </SessionProvider>
    </TRPCReactProvider>
  );
};
export default ChatLayout;
