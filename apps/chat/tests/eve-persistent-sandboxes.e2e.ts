import { afterAll, expect, test, vi } from "vitest";
import { inArray } from "drizzle-orm";
import { db } from "../lib/db/client";
import { env } from "../lib/env";
import { evePersistentSandbox, eveSandboxSession } from "../lib/db/schema";
import { assertEveTestDatabase } from "./eve-test-database";
import {
  reservePersistentSandbox,
  accessPersistentSandbox,
  retirePersistentSession,
  cleanupPersistentSession,
  stopDevelopmentPersistentSandboxes,
} from "../lib/eve/persistent-sandbox-store";

assertEveTestDatabase(env.DATABASE_URL);
const scope = {
  providerId: "vercel",
  accountId: "fixture",
  scopeId: "fixture",
};
const sessions: string[] = [];
const identity = () => {
  const sessionId = crypto.randomUUID();
  sessions.push(sessionId);
  return {
    sessionId,
    rootSessionId: sessionId,
    ownerId: "fixture",
    devRunId: crypto.randomUUID(),
  };
};
afterAll(async () => {
  await db
    .delete(evePersistentSandbox)
    .where(inArray(evePersistentSandbox.sessionId, sessions));
  await db
    .delete(eveSandboxSession)
    .where(inArray(eveSandboxSession.sessionId, sessions));
});
test("interrupted creation stays unknown even after retirement; no missing lookup clears it", async () => {
  const id = identity();
  const allocation = await reservePersistentSandbox(id, scope);
  await expect(reservePersistentSandbox(id, scope)).rejects.toThrow(
    "unresolved"
  );
  await retirePersistentSession(id);
  const remove = vi.fn();
  await expect(cleanupPersistentSession(id, scope, remove)).rejects.toThrow(
    "uncertain"
  );
  expect(remove).not.toHaveBeenCalled();
  expect(allocation.create).toBe(true);
});
test("known create can resume without reallocation; wrong scopes and retired cached handles fail", async () => {
  const id = identity();
  const allocation = await reservePersistentSandbox(id, scope);
  await accessPersistentSandbox(
    id,
    scope,
    allocation.name,
    async () => {
      await Promise.resolve();
    },
    true
  );
  expect(await reservePersistentSandbox(id, scope)).toEqual({
    name: allocation.name,
    create: false,
  });
  await expect(
    reservePersistentSandbox(id, { ...scope, scopeId: "foreign" })
  ).rejects.toThrow("replacement");
  const operation = vi.fn();
  await expect(
    accessPersistentSandbox(
      id,
      { ...scope, scopeId: "foreign" },
      allocation.name,
      operation
    )
  ).rejects.toThrow("scope changed");
  await retirePersistentSession(id);
  await expect(
    accessPersistentSandbox(id, scope, allocation.name, operation)
  ).rejects.toThrow("retired");
  expect(operation).not.toHaveBeenCalled();
  const remove = vi.fn(async () => {
    await Promise.resolve();
  });
  await cleanupPersistentSession(id, scope, remove);
  await cleanupPersistentSession(id, scope, remove);
  expect(remove).toHaveBeenCalledExactlyOnceWith(allocation.name);
});
test("retirement waits for an in-flight provider operation before allowing deletion", async () => {
  const id = identity();
  const allocation = await reservePersistentSandbox(id, scope);
  await accessPersistentSandbox(
    id,
    scope,
    allocation.name,
    async () => {
      await Promise.resolve();
    },
    true
  );
  const entered = Promise.withResolvers<boolean>();
  const release = Promise.withResolvers<boolean>();
  const order: string[] = [];
  const writer = accessPersistentSandbox(
    id,
    scope,
    allocation.name,
    async () => {
      entered.resolve(true);
      await release.promise;
      order.push("writer settled");
    }
  );
  await entered.promise;
  const retired = (async () => {
    await retirePersistentSession(id);
    order.push("retired");
  })();
  release.resolve(true);
  await Promise.all([writer, retired]);
  await cleanupPersistentSession(id, scope, async () => {
    await Promise.resolve();
    order.push("deleted");
  });
  expect(order).toEqual(["writer settled", "retired", "deleted"]);
});
test("shutdown stops only its dev run and retains files/ownership for resume", async () => {
  const id = identity();
  const allocation = await reservePersistentSandbox(id, scope);
  await accessPersistentSandbox(
    id,
    scope,
    allocation.name,
    async () => {
      await Promise.resolve();
    },
    true
  );
  const stop = vi.fn(async () => {
    await Promise.resolve();
  });
  await stopDevelopmentPersistentSandboxes("another-run", scope, stop);
  expect(stop).not.toHaveBeenCalled();
  await stopDevelopmentPersistentSandboxes(id.devRunId, scope, stop);
  expect(stop).toHaveBeenCalledExactlyOnceWith(allocation.name);
  const resumed = await reservePersistentSandbox(id, scope);
  expect(resumed.create).toBe(false);
});
test("retiring a root blocks a child's cached handles and new allocations", async () => {
  const root = identity();
  const child = { ...identity(), rootSessionId: root.sessionId };
  const allocation = await reservePersistentSandbox(child, scope);
  await accessPersistentSandbox(
    child,
    scope,
    allocation.name,
    async () => {
      await Promise.resolve();
    },
    true
  );
  await retirePersistentSession(root);
  await expect(
    accessPersistentSandbox(child, scope, allocation.name, async () => {
      await Promise.resolve();
    })
  ).rejects.toThrow("retired");
});
