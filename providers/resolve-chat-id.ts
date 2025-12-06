export type ChatIdType = "chat" | "provisional" | "shared";

export type ChatId = {
  id: string;
  type: ChatIdType;
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
    return { id: shareMatch[1], type: "shared" };
  }

  // /project/:projectId/chat/:chatId → existing chat
  // /project/:projectId → provisional
  const projectMatch = pathname?.match(PROJECT_ROUTE_PATTERN);
  if (projectMatch) {
    const chatId = projectMatch[2];
    return chatId
      ? { id: chatId, type: "chat" }
      : { id: provisionalId, type: "provisional" };
  }

  // /chat/:id → chat (or provisional if id matches)
  const chatMatch = pathname?.match(CHAT_ROUTE_PATTERN);
  if (chatMatch) {
    const urlChatId = chatMatch[1];
    return urlChatId === provisionalId
      ? { id: provisionalId, type: "provisional" }
      : { id: urlChatId, type: "chat" };
  }

  // / or anything else → provisional
  return { id: provisionalId, type: "provisional" };
}
