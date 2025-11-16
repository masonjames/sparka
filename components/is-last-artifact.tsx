"use client";
import type { ChatMessage } from "@/lib/ai/types";

export const isLastArtifact = (
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
