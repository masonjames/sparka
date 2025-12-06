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

type ChatIdContextType = {
  id: string;
  type: "chat" | "provisional" | "shared";
  refreshChatID: () => void;
};

const ChatIdContext = createContext<ChatIdContextType | undefined>(undefined);

type ChatId = {
  id: string;
  type: "chat" | "provisional" | "shared";
};

const PROJECT_ROUTE_PATTERN = /^\/project\/([^/]+)(?:\/chat\/(.+))?$/;
const CHAT_ID_PATTERN = /^\/chat\/(.+)$/;
export function ChatIdProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const provisionalChatIdRef = useRef<string>(generateUUID());
  console.log("pathname", pathname);

  // Compute final id and type directly from pathname and state
  const { id, type } = useMemo<ChatId>(() => {
    // Handle shared chat paths
    if (pathname?.startsWith("/share/")) {
      const sharedChatId = pathname.replace("/share/", "") || null;
      if (sharedChatId) {
        return {
          id: sharedChatId,
          type: "shared",
        };
      }
    }

    // Handle project routes
    const projectMatch = pathname?.match(PROJECT_ROUTE_PATTERN);
    if (projectMatch) {
      const [, _projectId, chatId] = projectMatch;
      if (chatId) {
        // /project/:projectId/chat/:chatId
        return {
          id: chatId,
          type: "chat",
        };
      }
      // /project/:projectId - provisional chat
      return {
        id: provisionalChatIdRef.current,
        type: "provisional",
      };
    }

    if (pathname === "/") {
      return {
        id: provisionalChatIdRef.current,
        type: "provisional",
      };
    }

    // Handle /chat/:id route
    const chatMatch = pathname?.match(CHAT_ID_PATTERN);
    if (chatMatch) {
      const urlChatId = chatMatch[1];
      if (urlChatId === provisionalChatIdRef.current) {
        // Id was provisional and now the url has been updated
        // Generate a new provisional id for a potential new chat
        provisionalChatIdRef.current = generateUUID();
      }
      return {
        id: urlChatId,
        type: "chat",
      };
    }

    // Default: provisional
    return {
      id: provisionalChatIdRef.current,
      type: "provisional",
    };
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
