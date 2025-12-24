"use client";

import { useChatStatus } from "@ai-sdk-tools/store";
import { ChatHeader } from "@/components/chat-header";
import { useMessageIds } from "@/lib/stores/hooks-base";
import { useSession } from "@/providers/session-provider";
import { MessagesPane } from "../messages-pane";
import { ProjectHome } from "../project-home";
import { useChatVotes } from "./use-chat-votes";

export function MainChatPanel({
  chatId,
  isProjectPage,
  projectId,
  isReadonly,
  disableSuggestedActions,
  className,
}: {
  chatId: string;
  isProjectPage?: boolean;
  projectId?: string;
  isReadonly: boolean;
  disableSuggestedActions?: boolean;
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
          status={status}
          votes={votes}
        />
      )}
    </div>
  );
}
