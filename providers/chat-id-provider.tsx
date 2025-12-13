"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { generateUUID } from "@/lib/utils";
import { type ChatIdType, resolveChatId } from "./resolve-chat-id";

type ChatIdContextType = {
  id: string;
  type: ChatIdType;
  /**
   * True when the current chatId is known to be persisted server-side (i.e. safe to query).
   * For existing chats, this is true immediately. For provisional chats, this flips when the
   * server confirms it saved the first user message.
   */
  isPersisted: boolean;
  markPendingChatId: (chatId: string) => void;
  confirmChatId: (chatId: string) => void;
  refreshChatID: () => void;
};

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

export function ChatIdProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [provisionalId, setProvisionalId] = useState<string>(() =>
    generateUUID()
  );
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);

  const { id, type, isPersisted } = useMemo(() => {
    const resolved = resolveChatId({
      pathname,
      provisionalId,
    });
    // If we pushed a provisional chatId into the URL, keep treating it as provisional
    // until the backend confirms persistence.
    if (
      resolved.type === "chat" &&
      pendingChatId &&
      pendingChatId === resolved.id
    ) {
      return { ...resolved, type: "provisional" as const, isPersisted: false };
    }
    return resolved;
  }, [pathname, provisionalId, pendingChatId]);

  const markPendingChatId = useCallback((chatId: string) => {
    setPendingChatId(chatId);
  }, []);

  const confirmChatId = useCallback(
    (chatId: string) => {
      if (pendingChatId !== chatId) {
        return;
      }
      setPendingChatId(null);
      // Regenerate provisional ID for future new chats (next time user goes to / or /project/:id)
      setProvisionalId(generateUUID());
    },
    [pendingChatId]
  );

  const refreshChatID = useCallback(() => {
    setProvisionalId(generateUUID());
    setPendingChatId(null);
  }, []);

  const value = useMemo(
    () => ({
      id,
      type,
      isPersisted,
      markPendingChatId,
      confirmChatId,
      refreshChatID,
    }),
    [id, type, isPersisted, markPendingChatId, confirmChatId, refreshChatID]
  );

  return (
    <ChatIdContext.Provider value={value}>{children}</ChatIdContext.Provider>
  );
}

export function useChatId() {
  const context = useContext(ChatIdContext);
  if (context === undefined) {
    throw new Error("useChatId must be used within a ChatIdProvider");
  }
  return context;
}
