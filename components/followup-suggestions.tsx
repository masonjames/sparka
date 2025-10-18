'use client';

import type { ChatMessage } from '@/lib/ai/types';
import type { UiToolName } from '@/lib/ai/types';
import { useChatStoreApi } from '@/lib/stores/chat-store-context';
import { useChatInput } from '@/providers/chat-input-provider';
import { generateUUID } from '@/lib/utils';
import { useCallback } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { PlusIcon } from 'lucide-react';
import {
  useMessagePartByPartIdx,
  useMessagePartTypesById,
} from '@/lib/stores/hooks-message-parts';

export function FollowUpSuggestions({
  suggestions,
  className,
}: {
  suggestions: string[];
  className?: string;
}) {
  const storeApi = useChatStoreApi();
  const { selectedModelId, selectedTool } = useChatInput();

  const handleClick = useCallback(
    (suggestion: string) => {
      const sendMessage = storeApi.getState().currentChatHelpers?.sendMessage;
      if (!sendMessage) return;

      const parentMessageId = storeApi.getState().getLastMessageId();

      const message: ChatMessage = {
        id: generateUUID(),
        role: 'user',
        parts: [
          {
            type: 'text',
            text: suggestion,
          },
        ],
        metadata: {
          createdAt: new Date(),
          parentMessageId,
          selectedModel: selectedModelId,
          selectedTool: (selectedTool as UiToolName | null) || undefined,
        },
      };

      sendMessage(message);
    },
    [storeApi, selectedModelId, selectedTool],
  );

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-2 mt-2 mb-2', className)}>
      <div className="text-xs font-medium text-muted-foreground">Related</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {suggestions.map((s) => (
          <Button
            key={s}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleClick(s)}
            className="rounded-full h-7 px-2.5 text-xs bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground shadow-none"
          >
            {s}
            <PlusIcon className="size-3 opacity-70" />
          </Button>
        ))}
      </div>
    </div>
  );
}

export function FollowUpSuggestionsParts({
  messageId,
}: {
  messageId: string;
}) {
  const types = useMessagePartTypesById(messageId);

  const partIdx = types.findIndex((t) => t === 'data-followupSuggestions');
  if (partIdx === -1) return null;
  return <FollowUpSuggestionsPart messageId={messageId} partIdx={partIdx} />;
}

function FollowUpSuggestionsPart({
  messageId,
  partIdx,
}: {
  messageId: string;
  partIdx: number;
}) {
  const part = useMessagePartByPartIdx(
    messageId,
    partIdx,
    'data-followupSuggestions',
  );
  const { data } = part;

  return <FollowUpSuggestions suggestions={data.suggestions} />;
}
