"use client";
import { useChatActions, useChatId, useChatStatus } from "@ai-sdk-tools/store";
import { useQuery } from "@tanstack/react-query";
import { ChatHeader } from "@/components/chat-header";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { useArtifactSelector } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/ai/types";
import { useMessageIds } from "@/lib/stores/hooks-base";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";
import { ArtifactPanel } from "./artifact-panel";
import { MessagesPane } from "./messages-pane";
import { ProjectHome } from "./project-home";

function useIsSecondaryChatPanelVisible() {
  return useArtifactSelector((state) => state.isVisible);
}

function useChatVotes(chatId: string, { isReadonly }: { isReadonly: boolean }) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const isLoading = chatId !== useChatId();
  const messageIds = useMessageIds() as string[];

  return useQuery({
    ...trpc.vote.getVotes.queryOptions({ chatId }),
    enabled:
      messageIds.length >= 2 && !isReadonly && !!session?.user && !isLoading,
  });
}

function MainChatPanel({
  chatId,
  isProjectPage,
  projectId,
  isReadonly,
  disableSuggestedActions,
  isSecondaryPanelVisible,
  className,
}: {
  chatId: string;
  isProjectPage?: boolean;
  projectId?: string;
  isReadonly: boolean;
  disableSuggestedActions?: boolean;
  isSecondaryPanelVisible: boolean;
  className?: string;
}) {
  const { data: session } = useSession();
  const status = useChatStatus();
  const messageIds = useMessageIds() as string[];
  const { data: votes } = useChatVotes(chatId, { isReadonly });
  const hasMessages = messageIds.length > 0;

  return (
    <div className={className}>
      <ChatHeader
        chatId={chatId}
        hasMessages={hasMessages}
        isReadonly={isReadonly}
        projectId={projectId}
        user={session?.user}
      />

      {isProjectPage && !hasMessages && projectId ? (
        <ProjectHome chatId={chatId} projectId={projectId} status={status} />
      ) : (
        <MessagesPane
          chatId={chatId}
          className="bg-background"
          disableSuggestedActions={disableSuggestedActions}
          isReadonly={isReadonly}
          isVisible={!isSecondaryPanelVisible}
          status={status}
          votes={votes}
        />
      )}
    </div>
  );
}

function SecondaryChatPanel({
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
  const { state: sidebarState } = useSidebar();
  const isSecondaryPanelVisible = useIsSecondaryChatPanelVisible();

  return (
    <div
      className={cn(
        "@container flex h-dvh min-w-0 max-w-screen flex-col bg-background md:max-w-[calc(100vw-var(--sidebar-width))]",
        sidebarState === "collapsed" && "md:max-w-screen"
      )}
    >
      <ResizablePanelGroup className="h-full w-full" direction="horizontal">
        <ResizablePanel
          className={isSecondaryPanelVisible ? "hidden md:block" : undefined}
          defaultSize={65}
          minSize={40}
        >
          <MainChatPanel
            chatId={id}
            className={cn("flex h-full min-w-0 flex-1 flex-col")}
            disableSuggestedActions={disableSuggestedActions}
            isProjectPage={isProjectPage}
            isReadonly={isReadonly}
            isSecondaryPanelVisible={isSecondaryPanelVisible}
            projectId={projectId}
          />
        </ResizablePanel>
        {/* TODO: Introduce withHandle prop to resizable ResizableHandle component and make sure it's in the middle */}
        {isSecondaryPanelVisible && (
          <ResizableHandle className="hidden md:block" />
        )}
        {isSecondaryPanelVisible && (
          <ResizablePanel defaultSize={35} minSize={25}>
            <SecondaryChatPanel
              chatId={id}
              className="flex h-full min-w-0 flex-1 flex-col"
              isReadonly={isReadonly}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
