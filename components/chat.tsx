"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useChatActions, useChatId, useChatStatus } from "@ai-sdk-tools/store";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { ChatHeader } from "@/components/chat-header";
import { useSidebar } from "@/components/ui/sidebar";
import { useArtifactSelector } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/ai/types";
import { useMessageIds } from "@/lib/stores/hooks";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";
import { Artifact } from "./artifact";
import { MessagesPane } from "./messages-pane";

export function Chat({
  id,
  initialMessages: _initialMessages,
  isReadonly,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
}) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const isLoading = id !== useChatId();

  const messageIds = useMessageIds() as string[];
  const status = useChatStatus();
  const { stop } = useChatActions<ChatMessage>();
  const stopAsync: UseChatHelpers<ChatMessage>["stop"] = useCallback(
    async () => stop?.(),
    [stop]
  );
  // regenerate no longer needs to be drilled; components call the store directly

  const { data: votes } = useQuery({
    ...trpc.vote.getVotes.queryOptions({ chatId: id }),
    enabled:
      messageIds.length >= 2 && !isReadonly && !!session?.user && !isLoading,
  });

  const { state } = useSidebar();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div
        className={cn(
          "@container flex h-dvh min-w-0 max-w-screen flex-col bg-background md:max-w-[calc(100vw-var(--sidebar-width))]",
          state === "collapsed" && "md:max-w-screen"
        )}
      >
        <ChatHeader
          chatId={id}
          hasMessages={messageIds.length > 0}
          isReadonly={isReadonly}
          user={session?.user}
        />

        <MessagesPane
          chatId={id}
          className="bg-background"
          isReadonly={isReadonly}
          isVisible={!isArtifactVisible}
          status={status}
          votes={votes}
        />
      </div>

      <Artifact
        chatId={id}
        isAuthenticated={!!session?.user}
        isReadonly={isReadonly}
        status={status}
        stop={stopAsync}
        votes={votes}
      />
    </>
  );
}
