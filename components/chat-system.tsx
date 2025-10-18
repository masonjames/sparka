'use client';

import { memo } from 'react';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ChatSync } from '@/components/chat-sync';
import { ChatInputProvider } from '@/providers/chat-input-provider';
import { ArtifactProvider } from '@/hooks/use-artifact';
import type { UiToolName, ChatMessage } from '@/lib/ai/types';
import { ChatStoreProvider } from '@/lib/stores/chat-store-context';
import { MessageTreeProvider } from '@/providers/message-tree-provider';
import { DataStreamProvider } from '@/components/data-stream-provider';
import type { AppModelId } from '@/lib/ai/app-models';

export const ChatSystem = memo(function ChatSystem({
  id,
  initialMessages,
  isReadonly,
  initialTool = null,
  overrideModelId,
}: {
  id: string;
  initialMessages: Array<ChatMessage>;
  isReadonly: boolean;
  initialTool?: UiToolName | null;
  overrideModelId?: AppModelId;
}) {
  return (
    <ArtifactProvider>
      <DataStreamProvider>
        <ChatStoreProvider initialMessages={initialMessages}>
          <MessageTreeProvider>
            {isReadonly ? (
              <>
                <ChatSync id={id} initialMessages={initialMessages} />
                <Chat
                  key={id}
                  id={id}
                  initialMessages={initialMessages}
                  isReadonly={isReadonly}
                />
              </>
            ) : (
              <ChatInputProvider
                localStorageEnabled={true}
                initialTool={initialTool ?? null}
                overrideModelId={overrideModelId}
              >
                <ChatSync id={id} initialMessages={initialMessages} />
                <Chat
                  key={id}
                  id={id}
                  initialMessages={initialMessages}
                  isReadonly={isReadonly}
                />
                <DataStreamHandler id={id} />
              </ChatInputProvider>
            )}
          </MessageTreeProvider>
        </ChatStoreProvider>
      </DataStreamProvider>
    </ArtifactProvider>
  );
});
