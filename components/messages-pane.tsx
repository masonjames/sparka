"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { memo } from "react";
import { CloneChatButton } from "@/components/clone-chat-button";
import type { ChatMessage } from "@/lib/ai/types";
import { useLastMessageId, useMessageIds } from "@/lib/stores/hooks-base";
import { cn } from "@/lib/utils";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";

export type MessagesPaneProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  isReadonly: boolean;
  className?: string;
};

function PureMessagesPane({
  chatId,
  status,
  isReadonly,
  className,
}: MessagesPaneProps) {
  const parentMessageId = useLastMessageId();
  const hasMessages = useMessageIds().length > 0;

  return (
    <div
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col", className)}
    >
      {hasMessages && <Messages
        className="h-full min-h-0 flex-1" isReadonly={isReadonly} />  
      }

      <div
        className={cn(
          "z-10 w-full",
          hasMessages
            ? "relative @[500px]:bottom-4 shrink-0"
            : "flex min-h-0 flex-1 items-center justify-center"
        )}
      >
        {isReadonly ? (
          <CloneChatButton chatId={chatId} className="w-full" />
        ) : (
          <div
            className={cn(
              "mx-auto w-full p-2 @[500px]:px-4 md:max-w-3xl",
              hasMessages ? "@[500px]:pb-4 @[500px]:md:pb-6" : undefined
            )}
          >
            <MultimodalInput
              chatId={chatId}
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
