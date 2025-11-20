"use client";
import { createChatStoreCreator } from "@ai-sdk-tools/store";
import type { UIMessage } from "ai";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { MarkdownMemoAugmentedState } from "./with-markdown-memo";
import { withMarkdownMemo } from "./with-markdown-memo";
import type { PartsAugmentedState } from "./with-message-parts";
import { withMessageParts } from "./with-message-parts";

export type CustomChatStoreState<UI_MESSAGE extends UIMessage> =
  MarkdownMemoAugmentedState<UI_MESSAGE> & PartsAugmentedState<UI_MESSAGE>;

export function createChatStore<UI_MESSAGE extends UIMessage>(
  initialMessages: UI_MESSAGE[] = []
) {
  // Base creator using combine for core ChatState + basic actions
  const baseCreator = createChatStoreCreator<UI_MESSAGE>(initialMessages);

  return createStore<
    MarkdownMemoAugmentedState<UI_MESSAGE> & PartsAugmentedState<UI_MESSAGE>
  >()(
    devtools(
      subscribeWithSelector(
        withMarkdownMemo<UI_MESSAGE>(initialMessages)(
          withMessageParts(baseCreator)
        )
      ),
      { name: "chat-store" }
    )
  );
}
