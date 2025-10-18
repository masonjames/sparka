'use client';
import { useChatId } from '@/lib/stores/hooks';
import { memo } from 'react';
import {
  Message as AIMessage,
  MessageContent as AIMessageContent,
} from './ai-elements/message';
import type { BaseMessageProps } from './user-message';
import { MessageActions } from './message-actions';
import { SourcesAnnotations } from './message-annotations';
import { MessageParts } from './message-parts';
import { PartialMessageLoading } from './partial-message-loading';
import { FollowUpSuggestionsParts } from './followup-suggestions';

const PureAssistantMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
}: Omit<BaseMessageProps, 'parentMessageId'>) => {
  const chatId = useChatId();

  if (!chatId) return null;

  return (
    <AIMessage from="assistant" className="w-full py-1 items-start">
      <AIMessageContent className="text-left px-0 py-0 w-full">
        <PartialMessageLoading messageId={messageId} />
        <MessageParts
          messageId={messageId}
          isLoading={isLoading}
          isReadonly={isReadonly}
        />

        <SourcesAnnotations
          key={`sources-annotations-${messageId}`}
          messageId={messageId}
        />

        <MessageActions
          key={`action-${messageId}`}
          chatId={chatId}
          messageId={messageId}
          vote={vote}
          isLoading={isLoading}
          isReadOnly={isReadonly}
        />
        {isReadonly ? null : <FollowUpSuggestionsParts messageId={messageId} />}
      </AIMessageContent>
    </AIMessage>
  );
};
export const AssistantMessage = memo(
  PureAssistantMessage,
  (prevProps, nextProps) => {
    if (prevProps.messageId !== nextProps.messageId) return false;
    if (prevProps.vote !== nextProps.vote) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.isReadonly !== nextProps.isReadonly) return false;
    return true;
  },
);
