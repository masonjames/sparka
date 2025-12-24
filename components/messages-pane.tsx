"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import type React from "react";
import { memo } from "react";
import { CloneChatButton } from "@/components/clone-chat-button";
import type { ChatMessage } from "@/lib/ai/types";
import type { Vote } from "@/lib/db/schema";
import { useLastMessageId } from "@/lib/stores/hooks-base";
import { cn } from "@/lib/utils";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

export type MessagesPaneProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  isReadonly: boolean;
  className?: string;
  disableSuggestedActions?: boolean;
  emptyStateOverride?: React.ReactNode;
};

function PureMessagesPane({
  chatId,
  status,
  votes,
  isReadonly,
  className,
  disableSuggestedActions,
  emptyStateOverride,
}: MessagesPaneProps) {
  const parentMessageId = useLastMessageId();

  return (
    <div
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col", className)}
    >
      <Messages isReadonly={isReadonly} votes={votes} />

      <div className="relative bottom-4 z-10 w-full">
        {isReadonly ? (
          <CloneChatButton chatId={chatId} className="w-full" />
        ) : (
          <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
            <MultimodalInput
              chatId={chatId}
              disableSuggestedActions={disableSuggestedActions}
              emptyStateOverride={emptyStateOverride}
              parentMessageId={parentMessageId}
              status={status}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const MessagesPane = memo(PureMessagesPane);
