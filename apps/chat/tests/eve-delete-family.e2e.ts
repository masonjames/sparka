/* oxlint-disable eslint/func-style -- Hoisted test helpers keep scenario setup readable and stable. */
/* oxlint-disable eslint/no-await-in-loop -- Integration steps and transaction fixtures intentionally run in order. */
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, expect, test, vi } from "vitest";

import { db } from "../lib/db/client";
import {
  recordEveCodeSandboxDeletion,
  reserveEveCodeSandbox,
} from "../lib/db/eve-code-sandboxes";
import { createEveConversation } from "../lib/db/eve-queries";
import {
  eveChat,
  eveCodeSandbox,
  eveConversation,
  user,
} from "../lib/db/schema";
import { env } from "../lib/env";
import { deleteLocalEveConversationFamily } from "../lib/eve/delete-local-conversation";
import { assertEveTestDatabase } from "./eve-test-database";

vi.mock("server-only", () => ({}));
// This suite exercises app-family state with synthetic native runs. Real native
// birth receipts and filesystem proof are covered by eve-deletion-retire.
vi.mock("../lib/eve/verify-local-coverage", () => ({
  verifyLocalEveFamilyCoverage: vi.fn(),
}));
// Fixtures below allocate no filesystem or blob resources; keep the test local.
vi.mock("../lib/eve/local-sandbox-fence", () => ({
  fenceLocalEveSandboxMutations: vi.fn(),
}));
/* oxlint-disable typescript/promise-function-async --
 * typescript/promise-function-async (#606): vi.mock("../lib/eve/local-sandbox-inventory") preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 */
vi.mock("../lib/eve/local-sandbox-inventory", () => ({
  readLocalEveSandboxInventory: () =>
    Promise.resolve({ owned: [], unattributedDirectories: [] }),
}));
/* oxlint-enable typescript/promise-function-async */
vi.mock("../lib/file-storage", () => ({
  deleteFilesByUrls: () => {
    throw new Error("Unexpected fixture blob");
  },
}));
assertEveTestDatabase(env.DATABASE_URL);
/* oxlint-disable typescript/strict-boolean-expressions --
 * typescript/strict-boolean-expressions (#610): if (!env.WORKFLOW_POSTGRES_URL) { throw new Error("Miss intentionally keeps the existing falsy-value behavior of env.WORKFLOW_POSTGRES_URL; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
if (!env.WORKFLOW_POSTGRES_URL) {
  throw new Error("Missing native database");
}
/* oxlint-enable typescript/strict-boolean-expressions */
assertEveTestDatabase(env.WORKFLOW_POSTGRES_URL);
const native = postgres(env.WORKFLOW_POSTGRES_URL, { max: 2 });
const provider = { projectId: "fixture-project", teamId: "fixture-team" };
const owner = crypto.randomUUID();
const sessionIds: string[] = [];
await db.insert(user).values({
  email: `${owner}@test.invalid`,
  id: owner,
  name: "Deletion fixture",
});
afterAll(async () => {
  await db.delete(eveCodeSandbox).where(eq(eveCodeSandbox.ownerId, owner));
  await db.delete(eveConversation).where(eq(eveConversation.ownerId, owner));
  await db.delete(user).where(eq(user.id, owner));
  for (const sessionId of sessionIds) {
    await native`delete from workflow.workflow_stream_chunks where run_id = ${sessionId}`;
    await native`delete from workflow.workflow_runs where id = ${sessionId}`;
    await native`delete from workflow.eve_session_retirements where session_id = ${sessionId}`;
    await native`delete from workflow.eve_payload_purges where session_id = ${sessionId}`;
    await native`delete from workflow.eve_queue_purge_runs where session_id = ${sessionId}`;
    await native`delete from workflow.eve_resource_fences where resource in ${native([`run:${sessionId}`, `stream:${sessionId}`])}`;
  }
  await native.end();
});
/* oxlint-disable typescript/promise-function-async, typescript/strict-boolean-expressions --
 * typescript/promise-function-async (#606): fixture preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 * typescript/strict-boolean-expressions (#610): fixture intentionally keeps the existing falsy-value behavior of parentId; distinguishing empty, zero, and absent states requires a domain behavior decision.
 */
async function fixture(parentId?: string) {
  const sessionId = crypto.randomUUID();
  sessionIds.push(sessionId);
  await native`insert into workflow.workflow_runs(id, name, deployment_id, status, attributes) values (${sessionId}, 'delete-fixture', 'fixture', 'completed', '{}')`;
  await native`insert into workflow.workflow_stream_chunks(id, stream_id, run_id, data, eof) values (${crypto.randomUUID()}, ${sessionId}, ${sessionId}, ${Buffer.from("private fixture")}, true)`;
  // This fixture is already retired; receipt avoids invoking the model/runtime.
  await native`insert into workflow.eve_session_retirements(session_id) values (${sessionId})`;
  const conversation = await createEveConversation(
    owner,
    crypto.randomUUID(),
    "Private fixture",
    () => Promise.resolve(sessionId),
    parentId
      ? { fork: { beforeTurnId: "turn_0", conversationId: parentId } }
      : undefined
  );
  return { ...conversation, sessionId };
}
/* oxlint-enable typescript/promise-function-async, typescript/strict-boolean-expressions */

test("full deletion keeps uncertain resources pending, then erases only its family and retries after payload removal", async () => {
  const target = await fixture();
  const child = await fixture(target.id);
  const unrelated = await fixture();
  const name = await reserveEveCodeSandbox(
    owner,
    target.id,
    "unallocated-fixture",
    provider
  );
  await expect(
    deleteLocalEveConversationFamily(owner, child.id, "/fixture")
  ).rejects.toThrow("uncertain code sandbox creation");
  expect(
    await native`select id from workflow.workflow_runs where id = ${target.sessionId}`
  ).toHaveLength(1);
  const [pending] = await db
    .select()
    .from(eveConversation)
    .where(eq(eveConversation.id, target.id));
  expect(pending.state).toBe("deleting");
  expect(pending.chatId).not.toBe(target.id);
  // The test never invoked an allocator for this reservation.
  await recordEveCodeSandboxDeletion(owner, target.id, name);
  expect(
    await deleteLocalEveConversationFamily(owner, child.id, "/fixture")
  ).toEqual({ rootId: pending.chatId });
  expect(
    await deleteLocalEveConversationFamily(owner, child.id, "/fixture")
  ).toEqual({ rootId: pending.chatId });
  for (const member of [target, child]) {
    expect(
      await native`select id from workflow.workflow_runs where id = ${member.sessionId}`
    ).toEqual([]);
    expect(
      await native`select id from workflow.workflow_stream_chunks where run_id = ${member.sessionId}`
    ).toEqual([]);
    const [deleted] = await db
      .select()
      .from(eveConversation)
      .where(eq(eveConversation.id, member.id));
    expect(deleted).toMatchObject({
      firstMessage: "",
      state: "deleted",
    });
  }
  const [deletedChat] = await db
    .select()
    .from(eveChat)
    .where(eq(eveChat.id, pending.chatId));
  expect(deletedChat).toMatchObject({
    activeConversationId: null,
    title: "",
  });
  expect(
    await deleteLocalEveConversationFamily("foreign", unrelated.id, "/fixture")
  ).toBeUndefined();
  expect(
    await native`select id from workflow.workflow_runs where id = ${unrelated.sessionId}`
  ).toHaveLength(1);
  const [survivor] = await db
    .select()
    .from(eveConversation)
    .where(eq(eveConversation.id, unrelated.id));
  expect(survivor.state).toBe("bound");
});

test("compatibility failure blocks the complete coordinator before revoking access", async () => {
  const target = await fixture();
  await native`alter table graphile_worker._private_jobs disable trigger eve_queue_fence`;
  try {
    await expect(
      deleteLocalEveConversationFamily(owner, target.id, "/fixture")
    ).rejects.toThrow("Workflow lifecycle fences are missing or disabled");
    const [binding] = await db
      .select({ state: eveConversation.state })
      .from(eveConversation)
      .where(eq(eveConversation.id, target.id));
    expect(binding).toEqual({ state: "bound" });
    expect(
      await native`select id from workflow.workflow_runs where id = ${target.sessionId}`
    ).toEqual([{ id: target.sessionId }]);
  } finally {
    await native`alter table graphile_worker._private_jobs enable trigger eve_queue_fence`;
  }
});
