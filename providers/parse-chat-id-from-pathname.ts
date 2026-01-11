export type ChatIdType = "chat" | "provisional";

export type ParsedChatIdFromPathname =
  | { type: "chat"; id: string }
  | { type: "provisional"; id: null };

const SHARE_ROUTE_PATTERN = /^\/share\/(.+)$/;
const PROJECT_ROUTE_PATTERN = /^\/project\/([^/]+)(?:\/chat\/(.+))?$/;
const CHAT_ROUTE_PATTERN = /^\/chat\/(.+)$/;

/**
 * Parse a Next.js pathname into a persisted chat id (if present).
 * Pure function - no side effects, easy to test.
 */
export function parseChatIdFromPathname(
  pathname: string | null
): ParsedChatIdFromPathname {
  // /share/:id → shared chat
  const shareMatch = pathname?.match(SHARE_ROUTE_PATTERN);
  if (shareMatch) {
    return { type: "chat", id: shareMatch[1] };
  }

  // /project/:projectId/chat/:chatId → chat
  // /project/:projectId → provisional (no chat id in path)
  const projectMatch = pathname?.match(PROJECT_ROUTE_PATTERN);
  if (projectMatch) {
    const chatId = projectMatch[2];
    if (chatId) {
      return { type: "chat", id: chatId };
    }
    return { type: "provisional", id: null };
  }

  // /chat/:id → chat
  const chatMatch = pathname?.match(CHAT_ROUTE_PATTERN);
  if (chatMatch) {
    return { type: "chat", id: chatMatch[1] };
  }

  // / or anything else → provisional
  return { type: "provisional", id: null };
}
