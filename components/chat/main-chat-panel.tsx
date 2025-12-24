"use client";

import { useChatStatus } from "@ai-sdk-tools/store";
import { ChatHeader } from "@/components/chat-header";
import { useMessageIds } from "@/lib/stores/hooks-base";
import { useSession } from "@/providers/session-provider";
import { MessagesPane } from "../messages-pane";
import { ProjectHome } from "../project-home";

export function MainChatPanel({
  chatId,
  isProjectPage,
  projectId,
  isReadonly,
  className,
}: {
  chatId: string;
  isProjectPage?: boolean;
  projectId?: string;
  isReadonly: boolean;
  className?: string;
}) {
  const { data: session } = useSession();
  const status = useChatStatus();
  const messageIds = useMessageIds() as string[];
  const hasMessages = messageIds.length > 0;

  const isProjectHome = isProjectPage && !hasMessages && projectId;

  return (
    <div className={className}>
      <ChatHeader
        chatId={chatId}
        hasMessages={hasMessages}
        isReadonly={isReadonly}
        projectId={projectId}
        user={session?.user}
      />

      {isProjectHome ? (
        <ProjectHome chatId={chatId} projectId={projectId} status={status} />
      ) : (
        <MessagesPane
          chatId={chatId}
          className="bg-background"
          isReadonly={isReadonly}
          status={status}
        />
      )}
    </div>
  );
}
