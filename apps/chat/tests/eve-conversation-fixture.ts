import { eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "../lib/db/client";
import { eveChat, eveConversation } from "../lib/db/schema";

type ConversationFixture = Readonly<
  Omit<typeof eveConversation.$inferInsert, "chatId" | "updatedAt">
> & {
  readonly chatId?: string;
  readonly isPinned?: boolean;
  readonly title?: string;
  readonly updatedAt?: Date | SQL;
};

/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions --
 * typescript/promise-function-async (#606): insertEveConversationFixtures preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 * typescript/strict-boolean-expressions (#610): insertEveConversationFixtures intentionally keeps the existing falsy-value behavior of conversation.parentConversationId; title; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
/**
 * Inserts conversation fixture rows and their chat metadata in one transaction.
 * Parent-first batches inherit their parent's chat ID; other fixtures receive a new chat ID.
 * @param {ConversationFixture | ConversationFixture[]} input One fixture or an ordered batch of fixtures.
 * @returns {Promise<(typeof eveConversation.$inferSelect)[]>} The inserted conversation rows in input order.
 */
export const insertEveConversationFixtures = (
  input: Readonly<ConversationFixture> | Readonly<ConversationFixture>[]
) =>
  db.transaction(async (tx) => {
    const inserted: (typeof eveConversation.$inferSelect)[] = [];
    for (const fixture of Array.isArray(input) ? input : [input]) {
      const {
        chatId: requestedChatId,
        isPinned,
        title,
        updatedAt,
        ...conversation
      } = fixture;
      const [parent] = conversation.parentConversationId
        ? // oxlint-disable-next-line eslint/no-await-in-loop -- Later fixture rows may depend on a parent inserted earlier in this transaction.
          await tx
            .select({ chatId: eveConversation.chatId })
            .from(eveConversation)
            .where(eq(eveConversation.id, conversation.parentConversationId))
        : [];
      const chatId = requestedChatId ?? parent?.chatId ?? crypto.randomUUID();
      // oxlint-disable-next-line eslint/no-await-in-loop -- Membership requires metadata to exist before the session row.
      await tx
        .insert(eveChat)
        .values({
          id: chatId,
          isPinned,
          ownerId: conversation.ownerId,
          title: title ?? conversation.firstMessage,
          titleStatus: title ? "manual" : "fallback",
          updatedAt,
        })
        .onConflictDoNothing();
      // oxlint-disable-next-line eslint/no-await-in-loop -- Preserve parent-before-child insertion order and return the actual session rows.
      const [row] = await tx
        .insert(eveConversation)
        .values({ ...conversation, chatId })
        .returning();
      inserted.push(row);
    }
    return inserted;
  });
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */
