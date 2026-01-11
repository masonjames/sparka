# URL Paths

This document explains the URL routing structure used in the application.

## Route Types

| Route Pattern | Example | Description |
|---------------|---------|-------------|
| `/` | `/` | Home page, provisional chat (not yet persisted) |
| `/chat/:id` | `/chat/abc123` | Standalone chat page |
| `/share/:id` | `/share/abc123` | Public shared chat page (read-only) |
| `/project/:projectId` | `/project/proj1` | Project page, provisional chat within project |
| `/project/:projectId/chat/:chatId` | `/project/proj1/chat/abc123` | Chat within a project |

## Parsing Pathnames

Use the `parseChatIdFromPathname` function from `@/providers/parse-chat-id-from-pathname` to extract routing information:

```ts
import { parseChatIdFromPathname } from "@/providers/parse-chat-id-from-pathname";

const result = parseChatIdFromPathname(pathname);
// result.type: "chat" | "provisional"
// result.id: string | null (the chat ID)
// result.source: "share" | "project" | "chat" | "home"
// result.projectId: string | null
```

### Return Values by Route

| Route | `type` | `id` | `source` | `projectId` |
|-------|--------|------|----------|-------------|
| `/` | `provisional` | `null` | `home` | `null` |
| `/chat/:id` | `chat` | `":id"` | `chat` | `null` |
| `/share/:id` | `chat` | `":id"` | `share` | `null` |
| `/project/:pid` | `provisional` | `null` | `project` | `":pid"` |
| `/project/:pid/chat/:cid` | `chat` | `":cid"` | `project` | `":pid"` |

## Related Hooks

- **`useChatId()`** - Returns the current chat ID context (uses `parseChatIdFromPathname` internally)
- **`useIsSharedRoute()`** - Returns `true` if on a `/share/:id` route

## Chat ID Lifecycle

1. **Provisional**: When a user starts a new chat, a provisional UUID is generated client-side
2. **Persisted**: Once the user sends a message, the chat is saved to the database with that ID
3. **URL Update**: After persistence, the URL is updated to `/chat/:id` or `/project/:pid/chat/:id`
