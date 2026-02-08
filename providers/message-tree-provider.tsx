"use client";

import { useChatActions, useChatReset } from "@ai-sdk-tools/store";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { useDataStream } from "@/components/data-stream-provider";
import { useArtifact } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/ai/types";
import {
  useResetThreadEpoch,
  useSetAllMessages,
  useSwitchToSibling,
} from "@/lib/stores/hooks-threads";
import { useTRPC } from "@/trpc/react";
import { useChatId } from "./chat-id-provider";

type MessageTreeProviderProps = {
  children: React.ReactNode;
};

/**
 * Syncs the server's message tree into the Zustand store and handles
 * home-page reset. Tree logic (sibling info, thread switching) lives
 * in the store (with-threads middleware).
 */
export function MessageTreeProvider({ children }: MessageTreeProviderProps) {
  const { id, isPersisted, source } = useChatId();
  const isShared = source === "share";
  const pathname = usePathname();
  const trpc = useTRPC();
  const reset = useChatReset();
  const { setDataStream } = useDataStream();
  const resetThreadEpoch = useResetThreadEpoch();
  const setAllMessages = useSetAllMessages();

  // React Query fetches the full tree from the server and feeds it into the store
  const messagesQuery = useQuery({
    ...(isShared
      ? trpc.chat.getPublicChatMessages.queryOptions({ chatId: id })
      : trpc.chat.getChatMessages.queryOptions({ chatId: id })),
    enabled: !!id && isPersisted && pathname !== "/",
  });

  // Sync server data → store whenever React Query resolves
  useEffect(() => {
    if (messagesQuery.data) {
      setAllMessages(messagesQuery.data as ChatMessage[]);
    }
  }, [messagesQuery.data, setAllMessages]);

  useEffect(() => {
    if (!isPersisted && pathname === "/") {
      reset();
      setDataStream([]);
      resetThreadEpoch();
    }
  }, [isPersisted, pathname, reset, setDataStream, resetThreadEpoch]);

  return children;
}

/**
 * Navigate to a sibling thread with side effects (stop stream, close artifact).
 * Uses the store's switchToSibling for the pure state transition.
 */
export function useNavigateToSibling() {
  const { stop } = useChatActions<ChatMessage>();
  const { setDataStream } = useDataStream();
  const { artifact, closeArtifact } = useArtifact();
  const switchToSibling = useSwitchToSibling();

  return useCallback(
    (messageId: string, direction: "prev" | "next") => {
      // Hard-disconnect the current stream + clear buffered deltas
      stop?.();
      setDataStream([]);

      const newThread = switchToSibling(messageId, direction);

      // Close artifact if its message is not in the new thread
      if (
        newThread &&
        artifact.isVisible &&
        artifact.messageId &&
        !newThread.some((m) => m.id === artifact.messageId)
      ) {
        closeArtifact();
      }
    },
    [
      artifact.isVisible,
      artifact.messageId,
      closeArtifact,
      setDataStream,
      stop,
      switchToSibling,
    ]
  );
}
