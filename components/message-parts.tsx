"use client";

import { useChatStoreApi } from "@ai-sdk-tools/store";
import { memo } from "react";
import type { ChatMessage } from "@/lib/ai/types";
import {
  useMessagePartByPartIdx,
  useMessagePartTypesById,
  useMessageResearchUpdatePartByToolCallId,
} from "@/lib/stores/hooks-message-parts";
import { isLastArtifact } from "./is-last-artifact";
import { CodeInterpreterMessage } from "./part/code-interpreter";
import { CreateDocument } from "./part/create-document";
import { DocumentToolResult } from "./part/document-common";
import { DocumentPreview } from "./part/document-preview";
import { GeneratedImage } from "./part/generated-image";
import { ResearchUpdates } from "./part/message-annotations";
import { MessageReasoning } from "./part/message-reasoning";
import { ReadDocument } from "./part/read-document";
import { RequestSuggestions } from "./part/request-suggestions";
import { Retrieve } from "./part/retrieve";
import { TextMessagePart } from "./part/text-message-part";
import { UpdateDocument } from "./part/update-document";
import { Weather } from "./part/weather";

type MessagePartsProps = {
  messageId: string;
  isLoading: boolean;
  isReadonly: boolean;
};

function DeepResearchPart({
  messageId,
  part,
  isReadonly,
}: {
  messageId: string;
  part: Extract<ChatMessage["parts"][number], { type: "tool-deepResearch" }>;
  isReadonly: boolean;
}) {
  const { toolCallId, state } = part;
  const researchUpdates = useMessageResearchUpdatePartByToolCallId(
    messageId,
    toolCallId
  );
  const chatStore = useChatStoreApi<ChatMessage>();

  if (state === "input-available") {
    return (
      <div className="flex w-full flex-col gap-3" key={toolCallId}>
        <ResearchUpdates updates={researchUpdates.map((u) => u.data)} />
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
            <ResearchUpdates updates={researchUpdates.map((u) => u.data)} />
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
  return null;
}

function WebSearchPart({
  messageId,
  part,
}: {
  messageId: string;
  part: Extract<ChatMessage["parts"][number], { type: "tool-webSearch" }>;
}) {
  const { toolCallId, state } = part;
  const researchUpdates = useMessageResearchUpdatePartByToolCallId(
    messageId,
    toolCallId
  );

  if (state === "input-available" || state === "output-available") {
    return (
      <div className="flex flex-col gap-3" key={toolCallId}>
        <ResearchUpdates updates={researchUpdates.map((u) => u.data)} />
      </div>
    );
  }
  return null;
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

  if (part.type === "tool-getWeather") {
    return <Weather key={part.toolCallId} tool={part} />;
  }

  if (type === "tool-createDocument") {
    return (
      <CreateDocument
        isReadonly={isReadonly}
        key={part.toolCallId}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (part.type === "tool-updateDocument") {
    return (
      <UpdateDocument
        isReadonly={isReadonly}
        key={part.toolCallId}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (part.type === "tool-requestSuggestions") {
    return (
      <RequestSuggestions
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

  if (part.type === "tool-codeInterpreter") {
    return <CodeInterpreterMessage key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-generateImage") {
    return <GeneratedImage key={part.toolCallId} tool={part} />;
  }

  if (type === "tool-deepResearch") {
    return (
      <DeepResearchPart
        isReadonly={isReadonly}
        messageId={messageId}
        part={part}
      />
    );
  }

  if (type === "tool-webSearch") {
    return <WebSearchPart messageId={messageId} part={part} />;
  }

  return null;
}

const MessagePart = memo(PureMessagePart);

// Render a single reasoning part by index
function PureReasoningPart({
  messageId,
  isLoading,
  partIdx,
}: {
  messageId: string;
  isLoading: boolean;
  partIdx: number;
}) {
  const part = useMessagePartByPartIdx(messageId, partIdx);
  if (part.type !== "reasoning") {
    return null;
  }

  return <MessageReasoning content={part.text} isLoading={isLoading} />;
}

const ReasoningPart = memo(PureReasoningPart);

export function PureMessageParts({
  messageId,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  const types = useMessagePartTypesById(messageId);

  return types.map((t, i) => {
    if (t === "reasoning") {
      const key = `message-${messageId}-reasoning-${i}`;
      const isLast = i === types.length - 1;
      return (
        <ReasoningPart
          isLoading={isLoading && isLast}
          key={key}
          messageId={messageId}
          partIdx={i}
        />
      );
    }

    if (t === "text") {
      const key = `message-${messageId}-text-${i}`;
      return <TextMessagePart key={key} messageId={messageId} partIdx={i} />;
    }

    const key = `message-${messageId}-part-${i}-${t}`;
    return (
      <MessagePart
        isReadonly={isReadonly}
        key={key}
        messageId={messageId}
        partIdx={i}
      />
    );
  });
}

export const MessageParts = memo(PureMessageParts);
