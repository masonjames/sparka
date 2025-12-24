import { cookies, headers } from "next/headers";
import { getChatModels } from "@/app/actions/get-chat-models";
import { AppSidebar } from "@/components/app-sidebar";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { type AppModelId, DEFAULT_CHAT_MODEL } from "@/lib/ai/app-models";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";
import { ChatModelsProvider } from "@/providers/chat-models-provider";
import { DefaultModelProvider } from "@/providers/default-model-provider";
import { SessionProvider } from "@/providers/session-provider";

import { TRPCReactProvider } from "@/trpc/react";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import { auth } from "../../lib/auth";
import { ChatProviders } from "./chat-providers";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const raw = await auth.api.getSession({ headers: await headers() });
  const session = raw
    ? {
        user: raw.user
          ? {
              id: raw.user.id,
              name: raw.user.name ?? null,
              email: raw.user.email ?? null,
              image: raw.user.image ?? null,
            }
          : undefined,
        expires: raw.session?.expiresAt
          ? new Date(raw.session.expiresAt).toISOString()
          : undefined,
      }
    : undefined;
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

  const cookieModel = cookieStore.get("chat-model")?.value as AppModelId;
  const isAnonymous = !session?.user;

  // Check if the model from cookie is available for anonymous users
  let defaultModel = cookieModel ?? DEFAULT_CHAT_MODEL;

  if (isAnonymous && cookieModel) {
    const isModelAvailable = ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(
      cookieModel as (typeof ANONYMOUS_LIMITS.AVAILABLE_MODELS)[number]
    );
    if (!isModelAvailable) {
      // Switch to default model if current model is not available for anonymous users
      defaultModel = DEFAULT_CHAT_MODEL;
    }
  }

  const chatModels = await getChatModels();

  // Prefetch model preferences for authenticated users
  if (session?.user?.id) {
    const queryClient = getQueryClient();
    // "Lazy prefetch": don't await; pending queries are dehydrated + streamed.
    void queryClient.prefetchQuery(
      trpc.settings.getModelPreferences.queryOptions()
    );
    void queryClient.prefetchQuery(trpc.project.list.queryOptions());
    void queryClient.prefetchQuery(trpc.chat.getAllChats.queryOptions());
  }

  return (
    <TRPCReactProvider>
      <HydrateClient>
        <SessionProvider initialSession={session}>
          <ChatProviders>
            <SidebarProvider defaultOpen={!isCollapsed}>
              <AppSidebar />
              <SidebarInset
                style={
                  {
                    "--header-height": "calc(var(--spacing) * 13)",
                  } as React.CSSProperties
                }
              >
                <ChatModelsProvider models={chatModels}>
                  <DefaultModelProvider defaultModel={defaultModel}>
                    <KeyboardShortcuts />

                    {children}
                  </DefaultModelProvider>
                </ChatModelsProvider>
              </SidebarInset>
            </SidebarProvider>
          </ChatProviders>
        </SessionProvider>
      </HydrateClient>
    </TRPCReactProvider>
  );
}
