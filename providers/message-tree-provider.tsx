"use client";

import { useChatActions, useChatReset } from "@ai-sdk-tools/store";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useDataStream } from "@/components/data-stream-provider";
import { useArtifact } from "@/hooks/use-artifact";
import { useIsSharedRoute } from "@/hooks/use-is-shared-route";
import type { ChatMessage } from "@/lib/ai/types";
import {
  useResetThreadEpoch,
  useSetMessagesWithEpoch,
  useThreadEpoch,
} from "@/lib/stores/hooks-threads";
import {
  buildThreadFromLeaf,
  findLeafDfsToRightFromMessageId,
} from "@/lib/thread-utils";
import { useTRPC } from "@/trpc/react";
import { useChatId } from "./chat-id-provider";

type MessageSiblingInfo = {
  siblings: ChatMessage[];
  siblingIndex: number;
};

type MessageTreeContextType = {
  getMessageSiblingInfo: (messageId: string) => MessageSiblingInfo | null;
  navigateToSibling: (messageId: string, direction: "prev" | "next") => void;
  threadEpoch: number;
};

const MessageTreeContext = createContext<MessageTreeContextType | undefined>(
  undefined
);

type MessageTreeProviderProps = {
  children: React.ReactNode;
};

export function MessageTreeProvider({ children }: MessageTreeProviderProps) {
  const { id, isPersisted } = useChatId();
  const isShared = useIsSharedRoute();
  const pathname = usePathname();
  const trpc = useTRPC();
  const setMessagesWithEpoch = useSetMessagesWithEpoch();
  const reset = useChatReset();
  const { stop } = useChatActions<ChatMessage>();
  const { setDataStream } = useDataStream();
  const threadEpoch = useThreadEpoch();
  const resetThreadEpoch = useResetThreadEpoch();
  const { artifact, closeArtifact } = useArtifact();

  const messagesQuery = useQuery({
    ...(isShared
      ? trpc.chat.getPublicChatMessages.queryOptions({ chatId: id })
      : trpc.chat.getChatMessages.queryOptions({ chatId: id })),
    enabled: !!id && isPersisted && pathname !== "/",
  });

  const allMessages = (messagesQuery.data ?? []) as ChatMessage[];

  useEffect(() => {
    if (!isPersisted && pathname === "/") {
      reset();
      setDataStream([]);
      resetThreadEpoch();
    }
  }, [isPersisted, pathname, reset, setDataStream, resetThreadEpoch]);

  // Build parent->children mapping once
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, ChatMessage[]>();
    for (const message of allMessages) {
      const parentId = message.metadata?.parentMessageId || null;

      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      const siblings = map.get(parentId);
      if (siblings) {
        siblings.push(message);
      }
    }

    // Sort siblings by createdAt
    for (const siblings of map.values()) {
      siblings.sort(
        (a, b) =>
          new Date(a.metadata?.createdAt || new Date()).getTime() -
          new Date(b.metadata?.createdAt || new Date()).getTime()
      );
    }

    return map;
  }, [allMessages]);

  const getMessageSiblingInfo = useCallback(
    (messageId: string): MessageSiblingInfo | null => {
      const message = allMessages.find((m) => m.id === messageId);
      if (!message) {
        return null;
      }

      const siblings =
        childrenMap.get(message.metadata?.parentMessageId || null) || [];
      const siblingIndex = siblings.findIndex((s) => s.id === messageId);

      return {
        siblings,
        siblingIndex,
      };
    },
    [allMessages, childrenMap]
  );

  const navigateToSibling = useCallback(
    (messageId: string, direction: "prev" | "next") => {
      if (!allMessages.length) {
        return;
      }
      const siblingInfo = getMessageSiblingInfo(messageId);
      if (!siblingInfo || siblingInfo.siblings.length <= 1) {
        return;
      }

      // Thread switch must hard-disconnect the current stream + clear buffered deltas,
      // otherwise the new DataStreamHandler can replay old deltas after remount.
      stop?.();
      setDataStream([]);

      const { siblings, siblingIndex } = siblingInfo;
      const nextIndex =
        direction === "next"
          ? (siblingIndex + 1) % siblings.length
          : (siblingIndex - 1 + siblings.length) % siblings.length;

      const targetSibling = siblings[nextIndex];
      const leaf = findLeafDfsToRightFromMessageId(
        childrenMap,
        targetSibling.id
      );
      const newThread = buildThreadFromLeaf(
        allMessages,
        leaf ? leaf.id : targetSibling.id
      );

      // Close artifact if its message is not in the new thread
      if (
        artifact.isVisible &&
        artifact.messageId &&
        !newThread.some((m) => m.id === artifact.messageId)
      ) {
        closeArtifact();
      }

      setMessagesWithEpoch(newThread);
    },
    [
      allMessages,
      artifact.isVisible,
      artifact.messageId,
      childrenMap,
      closeArtifact,
      getMessageSiblingInfo,
      setDataStream,
      setMessagesWithEpoch,
      stop,
    ]
  );

  const value = useMemo(
    () => ({
      getMessageSiblingInfo,
      navigateToSibling,
      threadEpoch,
    }),
    [getMessageSiblingInfo, navigateToSibling, threadEpoch]
  );

  return (
    <MessageTreeContext.Provider value={value}>
      {children}
    </MessageTreeContext.Provider>
  );
}

export function useMessageTree() {
  const context = useContext(MessageTreeContext);
  if (!context) {
    throw new Error("useMessageTree must be used within MessageTreeProvider");
  }
  return context;
}
