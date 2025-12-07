"use client";

import { memo } from "react";
import {
  useMessagePartByPartIdx,
  useMessagePartTypesById,
} from "@/lib/stores/hooks-message-parts";
import { CodeInterpreter } from "./part/code-interpreter";
import { CreateDocument } from "./part/create-document";
import { DeepResearch } from "./part/deep-research";
import { GeneratedImage } from "./part/generated-image";
import { MessageReasoning } from "./part/message-reasoning";
import { ReadDocument } from "./part/read-document";
import { RequestSuggestions } from "./part/request-suggestions";
import { Retrieve } from "./part/retrieve";
import { TextMessagePart } from "./part/text-message-part";
import { UpdateDocument } from "./part/update-document";
import { Weather } from "./part/weather";
import { WebSearch } from "./part/web-search";

type MessagePartsProps = {
  messageId: string;
  isLoading: boolean;
  isReadonly: boolean;
};

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
    return <CodeInterpreter key={part.toolCallId} tool={part} />;
  }

  if (part.type === "tool-generateImage") {
    return <GeneratedImage key={part.toolCallId} tool={part} />;
  }

  if (type === "tool-deepResearch") {
    return (
      <DeepResearch isReadonly={isReadonly} messageId={messageId} part={part} />
    );
  }

  if (type === "tool-webSearch") {
    return <WebSearch messageId={messageId} part={part} />;
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
