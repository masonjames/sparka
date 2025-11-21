"use client";

import type { UIMessage } from "@ai-sdk/react";
import {
  Provider as ChatProvider,
  createChatStoreCreator,
  ChatStoreContext
} from "@ai-sdk-tools/store";
import { type PropsWithChildren, useContext, useRef } from "react";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import {
  type PartsAugmentedState,
  withMessageParts,
} from "./with-message-parts";

export type NewChatStoreProviderProps<TMessage extends UIMessage = UIMessage> =
  PropsWithChildren<{
    initialMessages?: TMessage[];
    chatKey: string;
  }>;

export type CustomChatStoreState<UI_MESSAGE extends UIMessage = UIMessage> =
  PartsAugmentedState<UI_MESSAGE>;

export function createChatStore<TMessage extends UIMessage = UIMessage>(
  initialMessages: TMessage[] = []
) {
  return createStore<CustomChatStoreState<TMessage>>()(
    devtools(
      subscribeWithSelector(
        withMessageParts(createChatStoreCreator<TMessage>(initialMessages))
      ),
      { name: "chat-store" }
    )
  );
}

export type CustomChatStoreApi<TMessage extends UIMessage = UIMessage> =
  ReturnType<typeof createChatStore<TMessage>>;


export function useCustomChatStoreApi<
  TMessage extends UIMessage = UIMessage,
>() {
  const store = useContext(ChatStoreContext);
  if (!store) throw new Error("useChatStoreApi must be used within Provider");
  return store as CustomChatStoreApi<TMessage>;
}


export function CustomStoreProvider<TMessage extends UIMessage = UIMessage>({
  initialMessages = [],
  chatKey,
  children,
}: NewChatStoreProviderProps<TMessage>) {
  const storeRef = useRef<CustomChatStoreApi<TMessage> | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createChatStore<TMessage>(initialMessages);
  }

  return (
    <ChatProvider<TMessage>
      key={chatKey}
      initialMessages={initialMessages}
      store={storeRef.current || undefined}
    >
      {children}
    </ChatProvider>
  );
}