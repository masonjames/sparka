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

type ChatIdContextType = {
  id: string;
  /**
   * True when the current chatId is known to be persisted server-side (i.e. safe to query).
   * For existing chats, this is true immediately. For provisional chats, this flips when the
   * server confirms it saved the first user message.
   */
  isPersisted: boolean;
  confirmChatId: (chatId: string) => void;
  refreshChatID: () => void;
};

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

const SHARE_ROUTE_PATTERN = /^\/share\/(.+)$/;
const PROJECT_ROUTE_PATTERN = /^\/project\/([^/]+)(?:\/chat\/(.+))?$/;
const CHAT_ROUTE_PATTERN = /^\/chat\/(.+)$/;

function getPersistedChatIdFromPathname(pathname: string | null) {
  const shareMatch = pathname?.match(SHARE_ROUTE_PATTERN);
  if (shareMatch) {
    return shareMatch[1];
  }

  const projectMatch = pathname?.match(PROJECT_ROUTE_PATTERN);
  if (projectMatch) {
    const chatId = projectMatch[2];
    return chatId || null;
  }

  const chatMatch = pathname?.match(CHAT_ROUTE_PATTERN);
  if (chatMatch) {
    return chatMatch[1];
  }

  return null;
}

export function ChatIdProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [provisionalId, setProvisionalId] = useState<string>(() =>
    generateUUID()
  );
  const [confirmedChatId, setConfirmedChatId] = useState<string | null>(null);

  const { id, isPersisted } = useMemo(() => {
    const urlChatId = getPersistedChatIdFromPathname(pathname);
    if (urlChatId) {
      return { id: urlChatId, isPersisted: true };
    }
    if (confirmedChatId) {
      return { id: confirmedChatId, isPersisted: true };
    }
    return {
      id: provisionalId,
      isPersisted: false,
    };
  }, [pathname, provisionalId, confirmedChatId]);

  const confirmChatId = useCallback((chatId: string) => {
    setConfirmedChatId(chatId);
  }, []);

  const refreshChatID = useCallback(() => {
    setProvisionalId(generateUUID());
    setConfirmedChatId(null);
  }, []);

  const value = useMemo(
    () => ({
      id,
      isPersisted,
      confirmChatId,
      refreshChatID,
    }),
    [id, isPersisted, confirmChatId, refreshChatID]
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
