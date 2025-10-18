'use client';
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import type { UIMessage } from 'ai';
import { createBaseStateCreator, type BaseSC } from './chat-store-base';
import type { MarkdownMemoAugmentedState } from './with-markdown-memo';
import type { PartsAugmentedState } from './with-message-parts';
import { withMessageParts } from './with-message-parts';
import { withMarkdownMemo } from './with-markdown-memo';

export type CustomChatStoreState<UI_MESSAGE extends UIMessage> =
  MarkdownMemoAugmentedState<UI_MESSAGE> & PartsAugmentedState<UI_MESSAGE>;

export function createChatStore<UI_MESSAGE extends UIMessage>(
  initialMessages: UI_MESSAGE[] = [],
) {
  // Base creator using combine for core ChatState + basic actions
  const baseCreator: BaseSC<UI_MESSAGE> =
    createBaseStateCreator<UI_MESSAGE>(initialMessages);

  return createStore<
    MarkdownMemoAugmentedState<UI_MESSAGE> & PartsAugmentedState<UI_MESSAGE>
  >()(
    devtools(
      subscribeWithSelector(
        withMarkdownMemo<UI_MESSAGE>(initialMessages)(
          withMessageParts(baseCreator),
        ),
      ),
      { name: 'chat-store' },
    ),
  );
}
