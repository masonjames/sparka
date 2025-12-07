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
  isLoading,
}: {
  messageId: string;
  partIdx: number;
  isReadonly: boolean;
  isLoading: boolean;
}) {
  const part = useMessagePartByPartIdx(messageId, partIdx);
  const { type } = part;

  if (type === "text") {
    return <TextMessagePart messageId={messageId} partIdx={partIdx} />;
  }

  if (type === "reasoning") {
    return <MessageReasoning content={part.text} isLoading={isLoading} />;
  }

  if (type === "tool-getWeather") {
    return <Weather tool={part} />;
  }

  if (type === "tool-createDocument") {
    return (
      <CreateDocument
        isReadonly={isReadonly}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (type === "tool-updateDocument") {
    return (
      <UpdateDocument
        isReadonly={isReadonly}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (type === "tool-requestSuggestions") {
    return (
      <RequestSuggestions
        isReadonly={isReadonly}
        messageId={messageId}
        tool={part}
      />
    );
  }

  if (type === "tool-retrieve") {
    return <Retrieve tool={part} />;
  }

  if (type === "tool-readDocument") {
    return <ReadDocument tool={part} />;
  }

  if (type === "tool-codeInterpreter") {
    return <CodeInterpreter tool={part} />;
  }

  if (type === "tool-generateImage") {
    return <GeneratedImage tool={part} />;
  }

  if (type === "tool-deepResearch") {
    return (
      <DeepResearch isReadonly={isReadonly} messageId={messageId} part={part} />
    );
  }

  if (type === "tool-webSearch") {
    return <WebSearch messageId={messageId} part={part} />;
  }
}

const MessagePart = memo(PureMessagePart);

export function PureMessageParts({
  messageId,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  const types = useMessagePartTypesById(messageId);

  return types.map((t, i) => {
    const isLastReasoning = t === "reasoning" && i === types.length - 1;
    return (
      <MessagePart
        isLoading={isLoading && isLastReasoning}
        isReadonly={isReadonly}
        // biome-ignore lint/suspicious/noArrayIndexKey: we only have index at this point
        key={`message-${messageId}-${t}-${i}`}
        messageId={messageId}
        partIdx={i}
      />
    );
  });
}

export const MessageParts = memo(PureMessageParts);
