"use client";
import type { UIMessage } from "ai";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { type BaseSC, createBaseStateCreator } from "./chat-store-base";
import type { PartsAugmentedState } from "./with-message-parts";
import { withMessageParts } from "./with-message-parts";

export type CustomChatStoreState<UI_MESSAGE extends UIMessage> =
  PartsAugmentedState<UI_MESSAGE>;

export function createChatStore<UI_MESSAGE extends UIMessage>(
  initialMessages: UI_MESSAGE[] = []
) {
  // Base creator using combine for core ChatState + basic actions
  const baseCreator: BaseSC<UI_MESSAGE> =
    createBaseStateCreator<UI_MESSAGE>(initialMessages);

  return createStore<PartsAugmentedState<UI_MESSAGE>>()(
    devtools(subscribeWithSelector(withMessageParts(baseCreator)), {
      name: "chat-store",
    })
  );
}
