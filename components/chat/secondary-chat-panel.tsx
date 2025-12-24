"use client";

import { useChatActions, useChatStatus } from "@ai-sdk-tools/store";
import type { ChatMessage } from "@/lib/ai/types";
import { useSession } from "@/providers/session-provider";
import { ArtifactPanel } from "../artifact-panel";
import { useChatVotes } from "./use-chat-votes";

export function SecondaryChatPanel({
  chatId,
  isReadonly,
  className,
}: {
  chatId: string;
  isReadonly: boolean;
  className?: string;
}) {
  const { data: session } = useSession();
  const status = useChatStatus();
  const { stop } = useChatActions<ChatMessage>();
  const { data: votes } = useChatVotes(chatId, { isReadonly });

  return (
    <ArtifactPanel
      chatId={chatId}
      className={className}
      isAuthenticated={!!session?.user}
      isReadonly={isReadonly}
      status={status}
      stop={stop}
      votes={votes}
    />
  );
}
