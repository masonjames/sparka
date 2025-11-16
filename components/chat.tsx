"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { ChatHeader } from "@/components/chat-header";
import { useSidebar } from "@/components/ui/sidebar";
import { useArtifactSelector } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/ai/types";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import {
  useChatId,
  useChatStatus,
  useMessageIds,
} from "@/lib/stores/hooks-base";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/auth";
import type { Vote } from "@/lib/db/schema";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";
import { ArtifactPanel } from "./artifact";
import { MessagesPane } from "./messages-pane";
import { ProjectHome } from "./project-home";

function MainPanel({
  chatId,
  hasMessages,
  isProjectPage,
  projectId,
  isReadonly,
  disableSuggestedActions,
  isArtifactVisible,
  status,
  votes,
  user,
  className,
}: {
  chatId: string;
  hasMessages: boolean;
  isProjectPage?: boolean;
  projectId?: string;
  isReadonly: boolean;
  disableSuggestedActions?: boolean;
  isArtifactVisible: boolean;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
  user: Session["user"];
  className?: string;
}) {
  return (
    <div className={className}>
      <ChatHeader
        chatId={chatId}
        hasMessages={hasMessages}
        isReadonly={isReadonly}
        projectId={projectId}
        user={user}
      />

      {isProjectPage && !hasMessages && projectId ? (
        <ProjectHome chatId={chatId} projectId={projectId} status={status} />
      ) : (
        <MessagesPane
          chatId={chatId}
          className="bg-background"
          disableSuggestedActions={disableSuggestedActions}
          isReadonly={isReadonly}
          isVisible={!isArtifactVisible}
          status={status}
          votes={votes}
        />
      )}
    </div>
  );
}

export function Chat({
  id,
  initialMessages: _initialMessages,
  isReadonly,
  disableSuggestedActions,
  isProjectPage,
  projectId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  disableSuggestedActions?: boolean;
  isProjectPage?: boolean;
  projectId?: string;
}) {
  const chatStore = useChatStoreApi();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const isLoading = id !== useChatId();

  const messageIds = useMessageIds() as string[];
  const status = useChatStatus();
  const stopAsync: UseChatHelpers<ChatMessage>["stop"] = useCallback(() => {
    const helpers = chatStore.getState().currentChatHelpers;
    if (!helpers?.stop) {
      return Promise.resolve();
    }
    return helpers.stop();
  }, [chatStore]);
  // regenerate no longer needs to be drilled; components call the store directly

  const { data: votes } = useQuery({
    ...trpc.vote.getVotes.queryOptions({ chatId: id }),
    enabled:
      messageIds.length >= 2 && !isReadonly && !!session?.user && !isLoading,
  });

  const { state: sidebarState } = useSidebar();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div
        className={cn(
          "@container flex h-dvh min-w-0 max-w-screen flex-col bg-background md:max-w-[calc(100vw-var(--sidebar-width))]",
          sidebarState === "collapsed" && "md:max-w-screen"
        )}
      >
        <MainPanel
          chatId={id}
          hasMessages={messageIds.length > 0}
          isProjectPage={isProjectPage}
          projectId={projectId}
          isReadonly={isReadonly}
          disableSuggestedActions={disableSuggestedActions}
          isArtifactVisible={isArtifactVisible}
          status={status}
          votes={votes}
          user={session?.user}
          className="flex h-full min-w-0 flex-1 flex-col"
        />
      </div>

      <ArtifactPanel
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
