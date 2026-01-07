"use client";

import { useChatActions } from "@ai-sdk-tools/store";
import { useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import type { ChatMessage } from "@/lib/ai/types";

export type UseCompleteDataPartProps = {
  initialMessages: ChatMessage[];
};

// Completes the first received data part into a concrete message (e.g. data-appendMessage).
export function useCompleteDataPart({
  initialMessages,
}: UseCompleteDataPartProps) {
  const { dataStream } = useDataStream();
  const { setMessages } = useChatActions<ChatMessage>();

  useEffect(() => {
    if (!dataStream || dataStream.length === 0) {
      return;
    }

    const dataPart = dataStream[0];
    if (dataPart.type !== "data-appendMessage") {
      return;
    }

    const message = JSON.parse(dataPart.data);

    if (message.id === initialMessages.at(-1)?.id) {
      // Replace the last message because it was the partial one.
      setMessages([...initialMessages.slice(0, -1), message]);
      return;
    }

    setMessages([...initialMessages, message]);
  }, [dataStream, initialMessages, setMessages]);
}
