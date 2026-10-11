import { readFile, readdir } from "node:fs/promises";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import { eveChat, eveConversation, user } from "./schema";

const postgres = new PGlite();
const database = drizzle(postgres);
const DATABASE_SETUP_TIMEOUT_MS = 30_000;
const FIRST_TURN_INDEX = 0;
const FIRST_INPUT_INDEX = 0;
const NEXT_TURN_INDEX = 1;
const ABSENT_TURN_INDEX = 2;

vi.mock("./client", (): { db: typeof database } => ({ db: database }));
vi.mock("@/lib/env", () => ({ env: {} }));

const {
  captureEveDocumentCheckpoint,
  getEveDocumentRevision,
  saveEveDocumentRevision,
} = await import("./eve-documents");

const { snapshotPublicEveCopyDocuments } = await import("./eve-copy-documents");

beforeAll(async (): Promise<void> => {
  const migrationDirectory = new URL("migrations/", import.meta.url);
  const entries = await readdir(migrationDirectory);
  const filenames = entries.filter((name) => name.endsWith(".sql")).toSorted();
  /* oxlint-disable eslint/no-await-in-loop -- Apply checked-in SQL migrations in order, before seeding fixtures. */
  for (const name of filenames) {
    await postgres.exec(
      await readFile(new URL(name, migrationDirectory), "utf-8")
    );
  }
  /* oxlint-enable eslint/no-await-in-loop */
  await database.insert(user).values({
    email: "documents@example.test",
    id: "document-owner",
    name: "Document owner",
  });
}, DATABASE_SETUP_TIMEOUT_MS);

afterAll(async (): Promise<void> => {
  await postgres.close();
});

const seedConversation = async (conversationId: string): Promise<void> => {
  await database.insert(eveChat).values({
    id: conversationId,
    ownerId: "document-owner",
    title: "Documents",
  });
  await database.insert(eveConversation).values({
    chatId: conversationId,
    firstMessage: "Documents",
    id: conversationId,
    operationId: conversationId,
    ownerId: "document-owner",
    sessionId: conversationId,
    state: "bound",
    visibility: "public",
  });
};

type RevisionInput = Parameters<
  typeof saveEveDocumentRevision
>[typeof FIRST_INPUT_INDEX];
const revisionInput = (
  conversationId: string,
  documentId: string,
  title = "Original title"
): RevisionInput => ({
  content: "Original content",
  conversationId,
  documentId,
  expectedRevisionId: null,
  fileIds: [],
  kind: "text",
  operationId: `save:${documentId}`,
  ownerId: "document-owner",
  title,
  turnIndex: FIRST_TURN_INDEX,
});

it("rejects a missing conversation before persisting a revision", async (): Promise<void> => {
  const conversationId = crypto.randomUUID();
  const documentId = crypto.randomUUID();
  await expect(
    saveEveDocumentRevision(revisionInput(conversationId, documentId))
  ).rejects.toThrow("Conversation not found.");
  await expect(
    getEveDocumentRevision("document-owner", conversationId, documentId)
  ).resolves.toBeUndefined();
});

it("preserves replay identity and empty revision selection", async (): Promise<void> => {
  const conversationId = crypto.randomUUID();
  const documentId = crypto.randomUUID();
  await seedConversation(conversationId);
  const input = revisionInput(conversationId, documentId);
  const saved = await saveEveDocumentRevision(input);
  await expect(saveEveDocumentRevision(input)).resolves.toEqual(saved);
  await expect(
    getEveDocumentRevision("document-owner", conversationId, documentId, "")
  ).resolves.toEqual(saved);
  await expect(
    saveEveDocumentRevision(
      revisionInput(conversationId, documentId, "Changed")
    )
  ).rejects.toThrow("Document operation changed during replay.");
});

it("snapshots native turn checkpoints and rejects absent published boundaries", async (): Promise<void> => {
  const conversationId = crypto.randomUUID();
  const documentId = crypto.randomUUID();
  await seedConversation(conversationId);
  const saved = await saveEveDocumentRevision(
    revisionInput(conversationId, documentId)
  );
  await captureEveDocumentCheckpoint(
    "document-owner",
    conversationId,
    NEXT_TURN_INDEX
  );
  const resources = { documentIds: [documentId], revisionIds: [saved.id] };
  const snapshot = await snapshotPublicEveCopyDocuments(
    conversationId,
    conversationId,
    resources,
    [
      {
        messageIndex: NEXT_TURN_INDEX,
        sourceIndex: NEXT_TURN_INDEX,
        sourceKind: "turn",
      },
    ]
  );
  expect(snapshot.documents).toMatchObject([
    { documentId, headRevisionId: saved.id, revisions: [{ id: saved.id }] },
  ]);
  expect(snapshot.checkpoints).toEqual([
    {
      heads: [{ documentId, revisionId: saved.id }],
      messageIndex: NEXT_TURN_INDEX,
    },
  ]);
  await expect(
    snapshotPublicEveCopyDocuments(conversationId, conversationId, resources, [
      {
        messageIndex: ABSENT_TURN_INDEX,
        sourceIndex: ABSENT_TURN_INDEX,
        sourceKind: "turn",
      },
    ])
  ).rejects.toThrow("Published document boundary is unavailable.");
});
