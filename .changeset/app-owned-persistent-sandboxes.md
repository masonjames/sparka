---
"@chat-js/sandboxes": minor
"@chat-js/registry": minor
"@chat-js/cli": patch
---

Add an optional persistent filesystem capability to the shared sandbox provider contract and its Vercel registry implementation. Use app-owned EVE resource lifecycle handling exclusively in the CLI template, requiring a fresh world and current database schema. Release the shared package before distributing consumers of its new persistent export.
