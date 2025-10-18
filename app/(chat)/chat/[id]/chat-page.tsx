'use client';
import { getDefaultThread } from '@/lib/thread-utils';
import { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { UiToolName } from '@/lib/ai/types';
import { ChatSystem } from '@/components/chat-system';
import {
  useGetChatByIdQueryOptions,
  useGetChatMessagesQueryOptions,
} from '@/hooks/chat-sync-hooks';

export function ChatPage({ id }: { id: string }) {
  const getChatByIdQueryOptions = useGetChatByIdQueryOptions(id);
  const { data: chat } = useSuspenseQuery(getChatByIdQueryOptions);
  const getMessagesByChatIdQueryOptions = useGetChatMessagesQueryOptions();
  const { data: messages } = useSuspenseQuery(getMessagesByChatIdQueryOptions);

  const initialThreadMessages = useMemo(() => {
    if (!messages) return [];
    return getDefaultThread(
      messages.map((msg) => ({ ...msg, id: msg.id.toString() })),
    );
  }, [messages]);

  const initialTool = useMemo<UiToolName | null>(() => {
    const lastAssistantMessage = messages?.findLast(
      (m) => m.role === 'assistant',
    );
    if (!lastAssistantMessage || !Array.isArray(lastAssistantMessage.parts))
      return null;
    for (const part of lastAssistantMessage.parts) {
      if (
        part?.type === 'tool-deepResearch' &&
        part?.state === 'output-available' &&
        part?.output?.format === 'clarifying_questions'
      ) {
        return 'deepResearch';
      }
    }
    return null;
  }, [messages]);

  if (!id) {
    return notFound();
  }

  if (!chat) {
    return notFound();
  }

  return (
    <>
      <ChatSystem
        id={chat.id}
        initialMessages={initialThreadMessages}
        isReadonly={false}
        initialTool={initialTool}
      />
    </>
  );
}
