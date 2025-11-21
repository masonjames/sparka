"use client";

import { Provider as AiSdkToolsStoreProvider } from "@ai-sdk-tools/store";
import { memo, useRef } from "react";
import { Chat } from "@/components/chat";
import { ChatSync } from "@/components/chat-sync";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { ArtifactProvider } from "@/hooks/use-artifact";
import type { AppModelId } from "@/lib/ai/app-models";
import type { ChatMessage, UiToolName } from "@/lib/ai/types";
import {
  type CustomChatStoreApi,
  createChatStore,
} from "@/lib/stores/custom-store-provider";
import { ChatInputProvider } from "@/providers/chat-input-provider";
import { MessageTreeProvider } from "@/providers/message-tree-provider";

export const ChatSystem = memo(function ChatSystem({
  id,
  initialMessages,
  isReadonly,
  initialTool = null,
  overrideModelId,
  projectId,
  isProjectPage = false,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  initialTool?: UiToolName | null;
  overrideModelId?: AppModelId;
  projectId?: string;
  isProjectPage?: boolean;
}) {
  const storeRef = useRef<CustomChatStoreApi<ChatMessage> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createChatStore<ChatMessage>(initialMessages);
  }
  return (
    <ArtifactProvider>
      <DataStreamProvider>
        <AiSdkToolsStoreProvider<ChatMessage>
          initialMessages={initialMessages}
          
          store={storeRef.current}
        >
          {/* <ChatStoreProvider initialMessages={initialMessages}> */}
          <MessageTreeProvider>
            {isReadonly ? (
              <>
                <ChatSync
                  id={id}
                  initialMessages={initialMessages}
                  projectId={projectId}
                />
                <Chat
                  disableSuggestedActions={isProjectPage}
                  id={id}
                  initialMessages={initialMessages}
                  isProjectPage={isProjectPage}
                  isReadonly={isReadonly}
                  key={id}
                  projectId={projectId}
                />
              </>
            ) : (
              <ChatInputProvider
                initialTool={initialTool ?? null}
                localStorageEnabled={true}
                overrideModelId={overrideModelId}
              >
                <ChatSync
                  id={id}
                  initialMessages={initialMessages}
                  projectId={projectId}
                />
                <Chat
                  disableSuggestedActions={isProjectPage}
                  id={id}
                  initialMessages={initialMessages}
                  isProjectPage={isProjectPage}
                  isReadonly={isReadonly}
                  key={id}
                  projectId={projectId}
                />
                <DataStreamHandler id={id} />
              </ChatInputProvider>
            )}
          </MessageTreeProvider>
          {/* </ChatStoreProvider> */}
        </AiSdkToolsStoreProvider>
      </DataStreamProvider>
    </ArtifactProvider>
  );
});
