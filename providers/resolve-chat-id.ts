export type ChatIdType = "chat" | "provisional" | "shared";

export type ChatId = {
  id: string;
  type: ChatIdType;
  /** True when the provisional ID was just persisted and should be regenerated */
  shouldRefreshProvisionalId: boolean;
};

const SHARE_ROUTE_PATTERN = /^\/share\/(.+)$/;
const PROJECT_ROUTE_PATTERN = /^\/project\/([^/]+)(?:\/chat\/(.+))?$/;
const CHAT_ROUTE_PATTERN = /^\/chat\/(.+)$/;

/**
 * Resolves the chat ID and type from a pathname.
 * Pure function - no side effects, easy to test.
 */
export function resolveChatId({
  pathname,
  provisionalId,
}: {
  pathname: string | null;
  provisionalId: string;
}): ChatId {
  // /share/:id → shared chat
  const shareMatch = pathname?.match(SHARE_ROUTE_PATTERN);
  if (shareMatch) {
    return {
      id: shareMatch[1],
      type: "shared",
      shouldRefreshProvisionalId: false,
    };
  }

  // /project/:projectId/chat/:chatId → existing chat (refresh if matches provisional)
  // /project/:projectId → provisional
  const projectMatch = pathname?.match(PROJECT_ROUTE_PATTERN);
  if (projectMatch) {
    const chatId = projectMatch[2];
    if (chatId) {
      // URL has a chat ID - check if it's the provisional one being persisted
      const shouldRefresh = chatId === provisionalId;
      return {
        id: chatId,
        type: "chat",
        shouldRefreshProvisionalId: shouldRefresh,
      };
    }
    return {
      id: provisionalId,
      type: "provisional",
      shouldRefreshProvisionalId: false,
    };
  }

  // /chat/:id → chat (refresh if matches provisional, meaning it was just persisted)
  const chatMatch = pathname?.match(CHAT_ROUTE_PATTERN);
  if (chatMatch) {
    const urlChatId = chatMatch[1];
    const shouldRefresh = urlChatId === provisionalId;
    return {
      id: urlChatId,
      type: "chat",
      shouldRefreshProvisionalId: shouldRefresh,
    };
  }

  // / or anything else → provisional
  return {
    id: provisionalId,
    type: "provisional",
    shouldRefreshProvisionalId: false,
  };
}
