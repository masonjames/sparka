"use client";

import { useChatStoreApi } from "@ai-sdk-tools/store";
import { CornerDownRightIcon } from "lucide-react";
import { memo, useCallback } from "react";
import type { ChatMessage, UiToolName } from "@/lib/ai/types";
import { useMessageIds } from "@/lib/stores/hooks-base";
import {
  useMessagePartByPartIdx,
  useMessagePartTypesById,
} from "@/lib/stores/hooks-message-parts";
import { cn, generateUUID } from "@/lib/utils";
import { useChatInput } from "@/providers/chat-input-provider";

function FollowUpSuggestions({
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
      const sendMessage = storeApi.getState().sendMessage;
      if (!sendMessage) {
        return;
      }

      const parentMessageId = storeApi.getState().getLastMessageId();

      const message: ChatMessage = {
        id: generateUUID(),
        role: "user",
        parts: [
          {
            type: "text",
            text: suggestion,
          },
        ],
        metadata: {
          createdAt: new Date(),
          parentMessageId,
          selectedModel: selectedModelId,
          activeStreamId: null,
          selectedTool: (selectedTool as UiToolName | null) || undefined,
        },
      };

      sendMessage(message);
    },
    [storeApi, selectedModelId, selectedTool]
  );

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("mt-2 mb-1", className)}>
      <div
        className="mb-1.5 font-medium text-muted-foreground text-sm"
        id="followups-label"
      >
        Follow-ups
      </div>
      <ul aria-labelledby="followups-label">
        {suggestions.map((s, idx) => (
          <li
            className={cn(
              "list-none",
              idx !== suggestions.length - 1 && "border-border/60 border-b"
            )}
            key={`${idx}-${s}`}
          >
            <button
              className="flex w-full cursor-pointer items-center gap-2 py-2 text-left text-muted-foreground text-sm transition-colors hover:text-foreground"
              onClick={() => handleClick(s)}
              type="button"
            >
              <CornerDownRightIcon className="size-3.5 shrink-0" />
              <span>{s}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FollowUpSuggestionsParts({ messageId }: { messageId: string }) {
  const types = useMessagePartTypesById(messageId);
  const ids = useMessageIds();
  const isLastMessage = ids.at(-1) === messageId;

  if (!isLastMessage) {
    return null;
  }

  const partIdx = types.indexOf("data-followupSuggestions");
  if (partIdx === -1) {
    return null;
  }
  return <FollowUpSuggestionsPart messageId={messageId} partIdx={partIdx} />;
}

const FollowUpSuggestionsPart = memo(function FollowUpSuggestionsPart({
  messageId,
  partIdx,
}: {
  messageId: string;
  partIdx: number;
}) {
  const part = useMessagePartByPartIdx(
    messageId,
    partIdx,
    "data-followupSuggestions"
  );
  const { data } = part;

  return <FollowUpSuggestions suggestions={data.suggestions} />;
});
