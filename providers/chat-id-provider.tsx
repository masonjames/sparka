"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { generateUUID } from "@/lib/utils";
import { type ChatIdType, resolveChatId } from "./resolve-chat-id";

type ChatIdContextType = {
  id: string;
  type: ChatIdType;
  refreshChatID: () => void;
};

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

export function ChatIdProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const provisionalChatIdRef = useRef<string>(generateUUID());

  const { id, type } = useMemo(() => {
    const result = resolveChatId({
      pathname,
      provisionalId: provisionalChatIdRef.current,
    });

    // When the provisional chat was persisted, regenerate the ID for future new chats
    if (result.shouldRefreshProvisionalId) {
      provisionalChatIdRef.current = generateUUID();
    }

    return result;
  }, [pathname]);

  const refreshChatID = useCallback(() => {
    provisionalChatIdRef.current = generateUUID();
  }, []);

  const value = useMemo(
    () => ({
      id,
      type,
      refreshChatID,
    }),
    [id, type, refreshChatID]
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
