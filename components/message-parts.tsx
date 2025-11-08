"use client";

import { memo, useMemo } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import {
  useMessagePartByPartIdx,
  useMessagePartsByPartRange,
  useMessagePartTypesById,
} from "@/lib/stores/hooks-message-parts";
import { CodeInterpreterMessage } from "./part/code-interpreter-message";
import { CreateDocumentMessage } from "./part/create-document-message";
import { UpdateDocumentMessage } from "./part/update-document-message";
import { RequestSuggestionsMessage } from "./part/request-suggestions-message";
import { DocumentToolResult } from "./part/document-common";
import { DocumentPreview } from "./part/document-preview";
import { GeneratedImage } from "./part/generated-image";
import { ResearchUpdates } from "./part/message-annotations";
import { MessageReasoning } from "./part/message-reasoning";
import { ReadDocument } from "./part/read-document";
import { Retrieve } from "./part/retrieve";
import { StockChartMessage } from "./part/stock-chart-message";
import { TextMessagePart } from "./part/text-message-part";
import { Weather } from "./part/weather";

type MessagePartsProps = {
  messageId: string;
  isLoading: boolean;
  isReadonly: boolean;
};

const isLastArtifact = (
  messages: ChatMessage[],
  currentToolCallId: string
): boolean => {
  let lastArtifact: { messageIndex: number; toolCallId: string } | null = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant") {
      for (const part of message.parts) {
        if (
          (part.type === "tool-createDocument" ||
            part.type === "tool-updateDocument" ||
            part.type === "tool-deepResearch") &&
          part.state === "output-available"
        ) {
          lastArtifact = {
            messageIndex: i,
            toolCallId: part.toolCallId,
          };
          break;
        }
      }
      if (lastArtifact) {
        break;
      }
    }
  }

  return lastArtifact?.toolCallId === currentToolCallId;
};

function useResearchUpdates(
  messageId: string,
  partIdx: number,
  type: ChatMessage["parts"][number]["type"]
) {
  const types = useMessagePartTypesById(messageId);
  const startIdx = partIdx;
  const nextIdx = types.findIndex(
    (t, i) =>
      i > startIdx && (t === "tool-deepResearch" || t === "tool-webSearch")
  );

  // If not a research tool, constrain the range to empty to minimize work
  let sliceEnd = nextIdx === -1 ? types.length - 1 : nextIdx - 1;
  if (type !== "tool-deepResearch" && type !== "tool-webSearch") {
    sliceEnd = startIdx;
  }

  const range = useMessagePartsByPartRange(messageId, startIdx + 1, sliceEnd);

  if (type !== "tool-deepResearch" && type !== "tool-webSearch") {
    return [] as Extract<
      ChatMessage["parts"][number],
      { type: "data-researchUpdate" }
    >["data"][];
  }

  return range
    .filter((p) => p.type === "data-researchUpdate")
    .map(
      (u) =>
        (
          u as Extract<
            ChatMessage["parts"][number],
            { type: "data-researchUpdate" }
          >
        ).data
    );
}

// Render a single part by index with minimal subscriptions
function PureMessagePart({
  messageId,
  partIdx,
  isReadonly,
}: {
  messageId: string;
  partIdx: number;
  isReadonly: boolean;
}) {
  const part = useMessagePartByPartIdx(messageId, partIdx);
  const { type } = part;
  const researchUpdates = useResearchUpdates(messageId, partIdx, type);
  const chatStore = useChatStoreApi();

  if (part.type === "tool-getWeather") {
    return <Weather key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-createDocument") {
    return (
      <CreateDocumentMessage
        isReadonly={isReadonly}
        key={part.toolCallId}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (part.type === "tool-updateDocument") {
    return (
      <UpdateDocumentMessage
        isReadonly={isReadonly}
        key={part.toolCallId}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (part.type === "tool-requestSuggestions") {
    return (
      <RequestSuggestionsMessage
        isReadonly={isReadonly}
        key={part.toolCallId}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (part.type === "tool-retrieve") {
    return <Retrieve key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-readDocument") {
    return <ReadDocument key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-stockChart") {
    return <StockChartMessage key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-codeInterpreter") {
    return <CodeInterpreterMessage key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-generateImage") {
    return <GeneratedImage key={part.toolCallId} tool={part} />;
  }

  if (type === "tool-deepResearch") {
    const { toolCallId, state } = part;

    if (state === "input-available") {
      return (
        <div className="flex w-full flex-col gap-3" key={toolCallId}>
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
    if (state === "output-available") {
      const { output, input } = part;
      const shouldShowFullPreview = isLastArtifact(
        chatStore.getState().messages,
        toolCallId
      );

      if (output.format === "report") {
        return (
          <div key={toolCallId}>
            <div className="mb-2">
              <ResearchUpdates updates={researchUpdates} />
            </div>
            {shouldShowFullPreview ? (
              <DocumentPreview
                args={input}
                isReadonly={isReadonly}
                messageId={messageId}
                result={output}
                type="create"
              />
            ) : (
              <DocumentToolResult
                isReadonly={isReadonly}
                messageId={messageId}
                result={output}
                type="create"
              />
            )}
          </div>
        );
      }
    }
  }

  if (type === "tool-webSearch") {
    const { toolCallId, state } = part;

    if (state === "input-available") {
      return (
        <div className="flex flex-col gap-3" key={toolCallId}>
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
    if (state === "output-available") {
      return (
        <div className="flex flex-col gap-3" key={toolCallId}>
          <ResearchUpdates updates={researchUpdates} />
        </div>
      );
    }
  }

  return null;
}

const MessagePart = memo(PureMessagePart);

// Render contiguous reasoning parts; subscribes only to the specified range
export function PureMessageReasoningParts({
  messageId,
  startIdx,
  endIdx,
  isLoading,
}: {
  messageId: string;
  startIdx: number;
  endIdx: number;
  isLoading: boolean;
}) {
  const reasoningParts = useMessagePartsByPartRange(
    messageId,
    startIdx,
    endIdx,
    "reasoning"
  );

  return (
    <MessageReasoning
      isLoading={isLoading}
      reasoning={reasoningParts.map((p) => p.text)}
    />
  );
}

export function PureMessageParts({
  messageId,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  const types = useMessagePartTypesById(messageId);

  type NonReasoningPartType = Exclude<
    ChatMessage["parts"][number]["type"],
    "reasoning"
  >;

  const groups = useMemo(() => {
    const result: Array<
      | { kind: "reasoning"; startIndex: number; endIndex: number }
      | { kind: NonReasoningPartType; index: number }
    > = [];

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      if (t === "reasoning") {
        const start = i;
        while (i < types.length && types[i] === "reasoning") {
          i++;
        }
        const end = i - 1;
        result.push({ kind: "reasoning", startIndex: start, endIndex: end });
        i = end;
      } else {
        result.push({ kind: t as NonReasoningPartType, index: i });
      }
    }
    return result;
  }, [types]);

  return groups.map((group, groupIdx) => {
    if (group.kind === "reasoning") {
      const key = `message-${messageId}-reasoning-${groupIdx}`;
      const isLast = group.endIndex === types.length - 1;
      return (
        <PureMessageReasoningParts
          endIdx={group.endIndex}
          isLoading={isLoading && isLast}
          key={key}
          messageId={messageId}
          startIdx={group.startIndex}
        />
      );
    }

    if (group.kind === "text") {
      const key = `message-${messageId}-text-${group.index}`;
      return (
        <TextMessagePart
          key={key}
          messageId={messageId}
          partIdx={group.index}
        />
      );
    }

    const key = `message-${messageId}-part-${group.index}-${group.kind}`;
    return (
      <MessagePart
        isReadonly={isReadonly}
        key={key}
        messageId={messageId}
        partIdx={group.index}
      />
    );
  });
}

export const MessageParts = memo(PureMessageParts);
