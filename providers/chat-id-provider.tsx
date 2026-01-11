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
import {
  type ChatIdType,
  parseChatIdFromPathname,
} from "./parse-chat-id-from-pathname";

type ChatIdContextType = {
  id: string;
  type: ChatIdType;
  isPersisted: boolean;
  confirmChatId: (chatId: string) => void;
  refreshChatID: () => void;
};

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

export function ChatIdProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [provisionalChatId, setProvisionalChatId] = useState<string>(() => {
    const newId = generateUUID();
    return newId;
  });

  const resolvedId = useMemo(
    () => parseChatIdFromPathname(pathname),
    [pathname]
  );

  const [chatIsPersisted, setChatIsPersisted] = useState<boolean>(
    resolvedId.id !== null
  );

  const confirmChatIdPersisted = useCallback(
    (chatId: string) => {
      if (chatId !== provisionalChatId) {
        throw new Error("Chat ID mismatch");
      }
      setChatIsPersisted(true);
    },
    [provisionalChatId]
  );

  const refreshChatID = useCallback(() => {
    const newId = generateUUID();
    setProvisionalChatId(newId);
    setChatIsPersisted(false);
  }, []);

  const value = useMemo(
    () => ({
      id: resolvedId.id ?? provisionalChatId,
      type: resolvedId.type,
      isPersisted: chatIsPersisted,
      confirmChatId: confirmChatIdPersisted,
      refreshChatID,
    }),
    [
      resolvedId.id,
      resolvedId.type,
      provisionalChatId,
      chatIsPersisted,
      confirmChatIdPersisted,
      refreshChatID,
    ]
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
