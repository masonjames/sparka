"use server";
import type {
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthTokens,
} from "@ai-sdk/mcp";
import { del } from "@vercel/blob";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import type { Attachment, ChatMessage } from "@/lib/ai/types";
import { chatMessageToDbMessage } from "@/lib/message-conversion";
import {
  mapDBPartsToUIParts,
  mapUIMessagePartsToDBParts,
} from "@/lib/utils/message-mapping";
import type { ArtifactKind } from "../artifacts/artifact-kind";
import { db } from "./client";
import {
  chat,
  type DBMessage,
  document,
  type McpConnector,
  type McpOAuthSession,
  mcpConnector,
  mcpOAuthSession,
  message,
  type Part,
  part,
  project,
  type Suggestion,
  suggestion,
  type User,
  type UserModelPreference,
  user,
  userModelPreference,
  vote,
} from "./schema";

// Full client information includes both metadata and registration response
export type OAuthClientInformationFull = OAuthClientMetadata &
  OAuthClientInformation;

export async function getUserByEmail(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  projectId,
}: {
  id: string;
  userId: string;
  title: string;
  projectId?: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
      title,
      projectId: projectId ?? null,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Get all messages for this chat to clean up their attachments
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id));

    // Clean up attachments before deleting the chat (which will cascade delete messages)
    if (messagesToDelete.length > 0) {
      await deleteAttachmentsFromMessages(messagesToDelete);
    }

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  projectId,
}: {
  id: string;
  projectId?: string | null;
}) {
  console.log("[getChatsByUserId] Starting", {
    userId: id,
    projectId,
    projectIdType: typeof projectId,
    projectIdIsNull: projectId === null,
    projectIdIsUndefined: projectId === undefined,
  });

  try {
    let conditions: SQL<unknown> | undefined = eq(chat.userId, id);
    if (projectId === null) {
      // Filter for chats without a project
      conditions = and(eq(chat.userId, id), isNull(chat.projectId));
      console.log("[getChatsByUserId] Using null project condition");
    } else if (projectId) {
      // Filter for chats in a specific project
      conditions = and(eq(chat.userId, id), eq(chat.projectId, projectId));
      console.log("[getChatsByUserId] Using specific project condition", {
        projectId,
      });
    } else {
      // Get all chats for user
      conditions = eq(chat.userId, id);
      console.log("[getChatsByUserId] Using all chats condition");
    }

    console.log("[getChatsByUserId] Executing query");
    const result = await db
      .select()
      .from(chat)
      .where(conditions)
      .orderBy(desc(chat.updatedAt));

    console.log("[getChatsByUserId] Query completed", {
      count: result.length,
      sampleChat: result[0]
        ? {
            id: result[0].id,
            updatedAt: result[0].updatedAt,
            updatedAtType: typeof result[0].updatedAt,
          }
        : null,
    });

    return result;
  } catch (error) {
    console.error(
      "[getChatsByUserId] Failed to get chats by user from database",
      {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        userId: id,
        projectId,
      }
    );
    throw error;
  }
}

export async function createProject({
  id,
  userId,
  name,
  instructions = "",
}: {
  id: string;
  userId: string;
  name: string;
  instructions?: string;
}) {
  try {
    return await db.insert(project).values({
      id,
      userId,
      name,
      instructions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to create project in database");
    throw error;
  }
}

export async function getProjectsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(project)
      .where(eq(project.userId, userId))
      .orderBy(desc(project.updatedAt));
  } catch (error) {
    console.error("Failed to get projects by user from database");
    throw error;
  }
}

export async function getProjectById({ id }: { id: string }) {
  try {
    const [selectedProject] = await db
      .select()
      .from(project)
      .where(eq(project.id, id));
    return selectedProject;
  } catch (error) {
    console.error("Failed to get project by id from database");
    throw error;
  }
}

export async function updateProject({
  id,
  updates,
}: {
  id: string;
  updates: Partial<{ name: string; instructions: string }>;
}) {
  try {
    return await db
      .update(project)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(project.id, id));
  } catch (error) {
    console.error("Failed to update project in database");
    throw error;
  }
}

export async function deleteProject({ id }: { id: string }) {
  try {
    return await db.delete(project).where(eq(project.id, id));
  } catch (error) {
    console.error("Failed to delete project from database");
    throw error;
  }
}

export async function getChatsByProjectId({
  projectId,
}: {
  projectId: string;
}) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.projectId, projectId))
      .orderBy(desc(chat.updatedAt));
  } catch (error) {
    console.error("Failed to get chats by project id from database");
    throw error;
  }
}

export async function moveChatToProject({
  chatId,
  projectId,
}: {
  chatId: string;
  projectId: string | null;
}) {
  try {
    return await db.update(chat).set({ projectId }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to move chat to project in database");
    throw error;
  }
}

export async function tryGetChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (_error) {
    return null;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessage({
  id,
  chatId,
  message: chatMessage,
}: {
  id: string;
  chatId: string;
  message: ChatMessage;
}) {
  try {
    return await db.transaction(async (tx) => {
      // Convert ChatMessage to DBMessage (without parts)
      const dbMessage = chatMessageToDbMessage(chatMessage, chatId);
      dbMessage.id = id;

      // Insert message (without parts - parts are stored in Part table)
      await tx.insert(message).values(dbMessage);

      // Save parts to Part table
      const mappedDBParts = mapUIMessagePartsToDBParts(chatMessage.parts, id);
      if (mappedDBParts.length > 0) {
        await tx.insert(part).values(mappedDBParts);
      }

      // Update chat's updatedAt timestamp
      await updateChatUpdatedAt({ chatId });

      return;
    });
  } catch (error) {
    console.error("Failed to save message in database", error);
    throw error;
  }
}

// TODO: This should indicate the it's only updating messages for a single chat
export async function saveMessages({
  messages,
}: {
  messages: Array<{
    id: string;
    chatId: string;
    message: ChatMessage;
  }>;
}) {
  try {
    if (messages.length === 0) {
      return;
    }
    return await db.transaction(async (tx) => {
      // Insert messages (without parts - parts are stored in Part table)
      const dbMessages = messages.map(({ id, chatId, message: msg }) => {
        const dbMsg = chatMessageToDbMessage(msg, chatId);
        dbMsg.id = id;
        return dbMsg;
      });
      await tx.insert(message).values(dbMessages);

      // Save parts to Part table
      const allDbParts: Omit<Part, "id" | "createdAt">[] = [];
      for (const { id, message: msg } of messages) {
        const dbParts = mapUIMessagePartsToDBParts(msg.parts, id);
        allDbParts.push(...dbParts);
      }
      if (allDbParts.length > 0) {
        await tx.insert(part).values(allDbParts);
      }

      // Update chat's updatedAt timestamp for all affected chats
      const uniqueChatIds = [...new Set(messages.map(({ chatId }) => chatId))];
      await Promise.all(
        uniqueChatIds.map((chatId) => updateChatUpdatedAt({ chatId }))
      );

      return;
    });
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function updateMessage({
  id,
  chatId,
  message: chatMessage,
}: {
  id: string;
  chatId: string;
  message: ChatMessage;
}) {
  try {
    return await db.transaction(async (tx) => {
      // Convert ChatMessage to DBMessage (without parts)
      const dbMessage = chatMessageToDbMessage(chatMessage, chatId);
      dbMessage.id = id;

      // Update message (without parts - parts are stored in Part table)
      await tx
        .update(message)
        .set({
          annotations: dbMessage.annotations,
          attachments: dbMessage.attachments,
          createdAt: dbMessage.createdAt,
          isPartial: dbMessage.isPartial,
          parentMessageId: dbMessage.parentMessageId,
          lastContext: dbMessage.lastContext,
        })
        .where(eq(message.id, id));

      // Update parts in Part table
      // Delete existing parts
      await tx.delete(part).where(eq(part.messageId, id));

      // Insert new parts
      const mappedDBParts = mapUIMessagePartsToDBParts(chatMessage.parts, id);
      if (mappedDBParts.length > 0) {
        await tx.insert(part).values(mappedDBParts);
      }

      return;
    });
  } catch (error) {
    console.error("Failed to update message in database", error);
    throw error;
  }
}

export async function getAllMessagesByChatId({
  chatId,
}: {
  chatId: string;
}): Promise<ChatMessage[]> {
  try {
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));

    if (messages.length === 0) {
      return [];
    }

    // Load all parts for all messages in a single query
    const messageIds = messages.map((msg) => msg.id);
    const allParts = await db
      .select()
      .from(part)
      .where(inArray(part.messageId, messageIds))
      .orderBy(asc(part.messageId), asc(part.order));

    // Group parts by messageId
    const partsByMessageId = new Map<string, Part[]>();
    for (const dbPart of allParts) {
      const existing = partsByMessageId.get(dbPart.messageId) ?? [];
      existing.push(dbPart);
      partsByMessageId.set(dbPart.messageId, existing);
    }

    // Reconstruct ChatMessage objects with parts from Part table
    return messages.map((msg) => {
      const dbParts = partsByMessageId.get(msg.id);
      const parts =
        dbParts && dbParts.length > 0 ? mapDBPartsToUIParts(dbParts) : [];

      return {
        id: msg.id,
        role: msg.role as ChatMessage["role"],
        parts,
        metadata: {
          createdAt: msg.createdAt,
          isPartial: msg.isPartial,
          parentMessageId: msg.parentMessageId,
          selectedModel: (msg.selectedModel ||
            "") as ChatMessage["metadata"]["selectedModel"],
          selectedTool: (msg.selectedTool ||
            undefined) as ChatMessage["metadata"]["selectedTool"],
          usage: msg.lastContext as ChatMessage["metadata"]["usage"],
        },
      };
    });
  } catch (error) {
    console.error("Failed to get all messages by chat ID", error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  messageId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  messageId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      messageId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database", error);
    throw error;
  }
}

async function _getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database", error);
    throw error;
  }
}

export async function getDocumentsById({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}) {
  try {
    // First, get the document and check ownership
    const documents = await _getDocumentsById({ id });

    if (documents.length === 0) {
      return [];
    }

    const [doc] = documents;

    if (!userId || doc.userId !== userId) {
      // Need to check if chat is public
      const documentsWithVisibility = await db
        .select({
          id: document.id,
          createdAt: document.createdAt,
          title: document.title,
          content: document.content,
          kind: document.kind,
          userId: document.userId,
          messageId: document.messageId,
          chatVisibility: chat.visibility,
        })
        .from(document)
        .innerJoin(message, eq(document.messageId, message.id))
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(and(eq(document.id, id), eq(chat.visibility, "public")))
        .orderBy(asc(document.createdAt));

      return documentsWithVisibility;
    }

    return documents;
  } catch (error) {
    console.error(
      "Failed to get documents by id with visibility from database"
    );
    throw error;
  }
}

export async function getPublicDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select({
        id: document.id,
        createdAt: document.createdAt,
        title: document.title,
        content: document.content,
        kind: document.kind,
        userId: document.userId,
        messageId: document.messageId,
      })
      .from(document)
      .innerJoin(message, eq(document.messageId, message.id))
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(and(eq(document.id, id), eq(chat.visibility, "public")))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get public documents by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      "Failed to delete documents by id after timestamp from database"
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      "Failed to get suggestions by document version from database"
    );
    throw error;
  }
}

export async function getDocumentsByMessageIds({
  messageIds,
}: {
  messageIds: string[];
}) {
  if (messageIds.length === 0) {
    return [];
  }

  try {
    return await db
      .select()
      .from(document)
      .where(inArray(document.messageId, messageIds))
      .orderBy(asc(document.createdAt));
  } catch (error) {
    console.error("Failed to get documents by message IDs from database");
    throw error;
  }
}

export async function saveDocuments({
  documents,
}: {
  documents: Array<{
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string | null;
    userId: string;
    messageId: string;
    createdAt: Date;
  }>;
}) {
  if (documents.length === 0) {
    return;
  }

  try {
    return await db.insert(document).values(documents);
  } catch (error) {
    console.error("Failed to save documents in database", error);
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select()
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map((msg) => msg.id);

    if (messageIds.length > 0) {
      // Clean up attachments before deleting messages
      await deleteAttachmentsFromMessages(messagesToDelete);

      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by id after timestamp from database"
    );
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterMessageId({
  chatId,
  messageId,
}: {
  chatId: string;
  messageId: string;
}) {
  try {
    // First, get the target message to find its position in the chat
    const [targetMessage] = await db
      .select()
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));

    if (!targetMessage) {
      throw new Error("Target message not found");
    }

    // Get all messages in the chat ordered by creation time
    const allMessages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));

    // Find the index of the target message
    const targetIndex = allMessages.findIndex((msg) => msg.id === messageId);

    if (targetIndex === -1) {
      throw new Error("Target message not found in chat");
    }

    // Delete all messages after the target message (including the target itself)
    const messagesToDelete = allMessages.slice(targetIndex);
    const messageIdsToDelete = messagesToDelete.map((msg) => msg.id);

    if (messageIdsToDelete.length > 0) {
      // Clean up attachments before deleting messages
      await deleteAttachmentsFromMessages(messagesToDelete);

      // Delete the messages (votes will be deleted automatically via CASCADE)
      return await db
        .delete(message)
        .where(
          and(
            eq(message.chatId, chatId),
            inArray(message.id, messageIdsToDelete)
          )
        );
    }
  } catch (error) {
    console.error(
      "Failed to delete messages by chat id after message id from database"
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db
      .update(chat)
      .set({
        title,
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat title by id from database");
    throw error;
  }
}

export async function updateChatIsPinnedById({
  chatId,
  isPinned,
}: {
  chatId: string;
  isPinned: boolean;
}) {
  try {
    return await db
      .update(chat)
      .set({
        isPinned,
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat isPinned by id from database");
    throw error;
  }
}

export async function updateChatUpdatedAt({ chatId }: { chatId: string }) {
  try {
    return await db
      .update(chat)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat updatedAt by id from database");
    throw error;
  }
}

export async function getUserById({
  userId,
}: {
  userId: string;
}): Promise<User | undefined> {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return users[0];
}

export async function getMessagesWithAttachments() {
  try {
    return await db.select({ attachments: message.attachments }).from(message);
  } catch (error) {
    console.error(
      "Failed to get messages with attachments from database",
      error
    );
    throw error;
  }
}

export async function getAllAttachmentUrls(): Promise<string[]> {
  try {
    const messages = await getMessagesWithAttachments();

    const attachmentUrls: string[] = [];

    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        const attachments = msg.attachments as Attachment[];
        for (const attachment of attachments) {
          if (attachment.url) {
            attachmentUrls.push(attachment.url);
          }
        }
      }
    }

    return attachmentUrls;
  } catch (error) {
    console.error("Failed to get attachment URLs from database", error);
    throw error;
  }
}

async function deleteAttachmentsFromMessages(messages: DBMessage[]) {
  try {
    const attachmentUrls: string[] = [];

    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        const attachments = msg.attachments as Attachment[];
        for (const attachment of attachments) {
          if (attachment.url) {
            attachmentUrls.push(attachment.url);
          }
        }
      }
    }

    if (attachmentUrls.length > 0) {
      await del(attachmentUrls);
    }
  } catch (error) {
    console.error("Failed to delete attachments from Vercel Blob:", error);
    // Don't throw here - we still want to proceed with message deletion
    // even if blob cleanup fails
  }
}

export async function getUserModelPreferences({
  userId,
}: {
  userId: string;
}): Promise<UserModelPreference[]> {
  try {
    return await db
      .select()
      .from(userModelPreference)
      .where(eq(userModelPreference.userId, userId));
  } catch (error) {
    console.error("Failed to get user model preferences from database", error);
    throw error;
  }
}

export async function upsertUserModelPreference({
  userId,
  modelId,
  enabled,
}: {
  userId: string;
  modelId: string;
  enabled: boolean;
}): Promise<void> {
  try {
    await db
      .insert(userModelPreference)
      .values({
        userId,
        modelId,
        enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userModelPreference.userId, userModelPreference.modelId],
        set: {
          enabled,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Failed to upsert user model preference in database", error);
    throw error;
  }
}

// MCP Connector queries

export async function getMcpConnectorsByUserId({
  userId,
}: {
  userId: string;
}): Promise<McpConnector[]> {
  try {
    return await db
      .select()
      .from(mcpConnector)
      .where(or(eq(mcpConnector.userId, userId), isNull(mcpConnector.userId)))
      .orderBy(desc(mcpConnector.createdAt));
  } catch (error) {
    console.error("Failed to get MCP connectors from database", error);
    throw error;
  }
}

export async function getMcpConnectorById({
  id,
}: {
  id: string;
}): Promise<McpConnector | undefined> {
  try {
    const [connector] = await db
      .select()
      .from(mcpConnector)
      .where(eq(mcpConnector.id, id));
    return connector;
  } catch (error) {
    console.error("Failed to get MCP connector by id from database", error);
    throw error;
  }
}

export async function getMcpConnectorByNameId({
  userId,
  nameId,
  excludeId,
}: {
  userId: string | null;
  nameId: string;
  excludeId?: string;
}): Promise<McpConnector | undefined> {
  try {
    const conditions = [
      eq(mcpConnector.nameId, nameId),
      userId === null
        ? isNull(mcpConnector.userId)
        : eq(mcpConnector.userId, userId),
    ];

    const whereClause = excludeId
      ? and(...conditions, sql`${mcpConnector.id} != ${excludeId}::uuid`)
      : and(...conditions);

    const [connector] = await db.select().from(mcpConnector).where(whereClause);
    return connector;
  } catch (error) {
    console.error("Failed to get MCP connector by nameId from database", error);
    throw error;
  }
}

export async function createMcpConnector({
  userId,
  name,
  nameId,
  url,
  type,
  oauthClientId,
  oauthClientSecret,
}: {
  userId: string | null;
  name: string;
  nameId: string;
  url: string;
  type: "http" | "sse";
  oauthClientId?: string;
  oauthClientSecret?: string;
}): Promise<McpConnector> {
  try {
    const [connector] = await db
      .insert(mcpConnector)
      .values({
        userId,
        name,
        nameId,
        url,
        type,
        oauthClientId: oauthClientId ?? null,
        oauthClientSecret: oauthClientSecret ?? null,
      })
      .returning();
    return connector;
  } catch (error) {
    console.error("Failed to create MCP connector in database", error);
    throw error;
  }
}

export async function updateMcpConnector({
  id,
  updates,
}: {
  id: string;
  updates: Partial<{
    name: string;
    nameId: string;
    url: string;
    type: "http" | "sse";
    oauthClientId: string | null;
    oauthClientSecret: string | null;
    enabled: boolean;
  }>;
}): Promise<void> {
  try {
    await db
      .update(mcpConnector)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(mcpConnector.id, id));
  } catch (error) {
    console.error("Failed to update MCP connector in database", error);
    throw error;
  }
}

export async function deleteMcpConnector({
  id,
}: {
  id: string;
}): Promise<void> {
  try {
    await db.delete(mcpConnector).where(eq(mcpConnector.id, id));
  } catch (error) {
    console.error("Failed to delete MCP connector from database", error);
    throw error;
  }
}

// MCP OAuth Session queries

export async function getAuthenticatedSession({
  mcpConnectorId,
}: {
  mcpConnectorId: string;
}): Promise<McpOAuthSession | undefined> {
  const [session] = await db
    .select()
    .from(mcpOAuthSession)
    .where(
      and(
        eq(mcpOAuthSession.mcpConnectorId, mcpConnectorId),
        isNotNull(mcpOAuthSession.tokens)
      )
    )
    .orderBy(desc(mcpOAuthSession.updatedAt))
    .limit(1);
  return session;
}

export async function getSessionByState({
  state,
}: {
  state: string;
}): Promise<McpOAuthSession | undefined> {
  if (!state) {
    return;
  }
  const [session] = await db
    .select()
    .from(mcpOAuthSession)
    .where(eq(mcpOAuthSession.state, state));
  return session;
}

export async function createOAuthSession({
  mcpConnectorId,
  serverUrl,
  state,
  codeVerifier,
  clientInfo,
}: {
  mcpConnectorId: string;
  serverUrl: string;
  state: string;
  codeVerifier?: string;
  clientInfo?: OAuthClientInformationFull;
}): Promise<McpOAuthSession> {
  const [session] = await db
    .insert(mcpOAuthSession)
    .values({
      mcpConnectorId,
      serverUrl,
      state,
      codeVerifier,
      clientInfo,
    })
    .returning();
  return session;
}

export async function updateSessionByState({
  state,
  updates,
}: {
  state: string;
  updates: {
    codeVerifier?: string;
    clientInfo?: OAuthClientInformationFull;
    tokens?: OAuthTokens;
  };
}): Promise<McpOAuthSession> {
  const [session] = await db
    .update(mcpOAuthSession)
    .set(updates)
    .where(eq(mcpOAuthSession.state, state))
    .returning();
  if (!session) {
    throw new Error(`Session with state ${state} not found`);
  }
  return session;
}

export async function saveTokensAndCleanup({
  state,
  mcpConnectorId,
  tokens,
}: {
  state: string;
  mcpConnectorId: string;
  tokens: OAuthTokens;
}): Promise<McpOAuthSession> {
  // Save tokens to the session
  const [session] = await db
    .update(mcpOAuthSession)
    .set({ tokens })
    .where(eq(mcpOAuthSession.state, state))
    .returning();

  if (!session) {
    throw new Error(`Session with state ${state} not found`);
  }

  // Cleanup: delete incomplete sessions (no tokens) for this connector except current
  await db
    .delete(mcpOAuthSession)
    .where(
      and(
        eq(mcpOAuthSession.mcpConnectorId, mcpConnectorId),
        isNull(mcpOAuthSession.tokens),
        ne(mcpOAuthSession.state, state)
      )
    );

  return session;
}

export async function deleteSessionByState({
  state,
}: {
  state: string;
}): Promise<void> {
  await db.delete(mcpOAuthSession).where(eq(mcpOAuthSession.state, state));
}

export async function deleteSessionsByConnectorId({
  mcpConnectorId,
}: {
  mcpConnectorId: string;
}): Promise<void> {
  await db
    .delete(mcpOAuthSession)
    .where(eq(mcpOAuthSession.mcpConnectorId, mcpConnectorId));
}
