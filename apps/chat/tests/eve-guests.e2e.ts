import { userCredit } from "@/plugins/credits/credits-schema";
import { eq, inArray } from "drizzle-orm";
import { afterAll, expect, test, vi } from "vitest";

import { db } from "../lib/db/client";
import { recordEveUsage } from "../lib/db/eve-billing";
import {
  commitEveGuestMessage,
  createEveGuest,
  releaseEveGuestCreation,
  releaseEveGuestMessage,
  reserveEveGuestMessage,
  reserveEveGuestMessages,
} from "../lib/db/eve-guests";
import { createEveConversation } from "../lib/db/eve-queries";
import { reserveEveResponseGroupInTransaction } from "../lib/db/eve-response-groups";
import {
  eveConversation,
  eveDispatch,
  eveGuest,
  eveGuestMessage,
  eveGuestRate,
  eveUsage,
  session,
  user,
} from "../lib/db/schema";
import { env } from "../lib/env";
import {
  createEveGuestCredential,
  eveGuestOwnerId,
} from "../lib/eve/guest-credential";
import { eveResponseGroupCandidates } from "../lib/eve/response-group-candidates";
import { assertEveTestDatabase } from "./eve-test-database";

assertEveTestDatabase(env.DATABASE_URL);
const owners: string[] = [];
const ips: string[] = [];

const findEveGuest = async (
  tokenHash: string
): Promise<typeof eveGuest.$inferSelect | undefined> => {
  const [row] = await db
    .select()
    .from(eveGuest)
    .where(eq(eveGuest.tokenHash, tokenHash));
  if (row !== undefined && row.expiresAt > new Date()) {
    return row;
  }
  return undefined;
};

const guest = async () => {
  const credential = createEveGuestCredential();
  const row = await createEveGuest({
    expiresAt: new Date(Date.now() + 60_000),
    tokenHash: credential.tokenHash,
  });
  owners.push(row.ownerId);
  return row;
};

const rateCounts = async (ipHash: string): Promise<number[]> => {
  const rows = await db
    .select()
    .from(eveGuestRate)
    .where(eq(eveGuestRate.ipHash, ipHash));
  return rows.map((row) => row.requests);
};

const request = (ownerId: string) => {
  const ipHash = createEveGuestCredential().tokenHash;
  ips.push(ipHash);
  return {
    ipHash,
    operationId: crypto.randomUUID(),
    ownerId,
    requestHash: createEveGuestCredential().tokenHash,
    requestsPerMinute: 100,
    requestsPerMonth: 100,
  };
};

afterAll(async () => {
  if (owners.length > 0) {
    await db.delete(eveUsage).where(inArray(eveUsage.ownerId, owners));
    await db.delete(eveDispatch).where(inArray(eveDispatch.ownerId, owners));
    await db
      .delete(eveConversation)
      .where(inArray(eveConversation.ownerId, owners));
    await db.delete(user).where(inArray(user.id, owners));
  }
  if (ips.length > 0) {
    await db.delete(eveGuestRate).where(inArray(eveGuestRate.ipHash, ips));
  }
});

test("guest identity is server-owned, expires and grants no BetterAuth session or signup credits", async () => {
  const row = await guest();
  const guestIdentity = await findEveGuest(row.tokenHash);
  expect(guestIdentity?.ownerId).toBe(row.ownerId);
  expect(
    await findEveGuest(createEveGuestCredential().tokenHash)
  ).toBeUndefined();
  expect(
    await db.select().from(userCredit).where(eq(userCredit.userId, row.ownerId))
  ).toEqual([]);
  expect(
    await db.select().from(session).where(eq(session.userId, row.ownerId))
  ).toEqual([]);
  await db
    .update(eveGuest)
    .set({ expiresAt: new Date(0) })
    .where(eq(eveGuest.ownerId, row.ownerId));
  expect(await findEveGuest(row.tokenHash)).toBeUndefined();
  expect(await reserveEveGuestMessage(request(row.ownerId))).toEqual({
    status: "unavailable",
  });
});

test("concurrent replay reserves once and rejects changed request content", async () => {
  const row = await guest();
  const input = request(row.ownerId);
  const attempts = await Promise.all(
    Array.from({ length: 8 }, async () => await reserveEveGuestMessage(input))
  );
  expect(
    attempts.filter((result) => result.status === "reserved")
  ).toHaveLength(1);
  expect(attempts.filter((result) => result.status === "replay")).toHaveLength(
    7
  );
  const rates = await db
    .select()
    .from(eveGuestRate)
    .where(eq(eveGuestRate.ipHash, input.ipHash));
  expect(
    rates.map((rate: { readonly requests: number }) => rate.requests)
  ).toEqual([1, 1]);
  expect(
    await reserveEveGuestMessage({
      ...input,
      requestHash: createEveGuestCredential().tokenHash,
    })
  ).toEqual({ status: "conflict" });
});

test("distinct concurrent sends cannot exceed the IP rate limit", async () => {
  const row = await guest();
  const input = { ...request(row.ownerId), requestsPerMinute: 1 };
  const results = await Promise.all(
    Array.from(
      { length: 6 },
      async () =>
        await reserveEveGuestMessage({
          ...input,
          operationId: crypto.randomUUID(),
        })
    )
  );
  expect(results.filter((result) => result.status === "reserved")).toHaveLength(
    1
  );
  expect(
    results.filter((result) => result.status === "rate-limited")
  ).toHaveLength(5);
});

test("IP quotas survive cookie replacement and rejected sends consume no capacity", async () => {
  const first = await guest();
  const second = await guest();
  const input = { ...request(first.ownerId), requestsPerMonth: 1 };
  const initialReservation = await reserveEveGuestMessage(input);
  expect(initialReservation.status).toBe("reserved");
  expect(
    await reserveEveGuestMessage({
      ...input,
      operationId: crypto.randomUUID(),
      ownerId: second.ownerId,
    })
  ).toEqual({ status: "rate-limited" });
  const ipQuotaRowsAfterLimit = await db
    .select()
    .from(eveGuestRate)
    .where(eq(eveGuestRate.ipHash, input.ipHash));
  expect(
    ipQuotaRowsAfterLimit.map(
      (rate: { readonly requests: number }) => rate.requests
    )
  ).toEqual([1, 1]);
});

test("simultaneous guests share one IP admission limit", async () => {
  const first = await guest();
  const second = await guest();
  const input = { ...request(first.ownerId), requestsPerMinute: 1 };
  const results = await Promise.all([
    reserveEveGuestMessage(input),
    reserveEveGuestMessage({
      ...input,
      operationId: crypto.randomUUID(),
      ownerId: second.ownerId,
    }),
  ]);
  expect(results.map((result) => result.status).toSorted()).toEqual([
    "rate-limited",
    "reserved",
  ]);
});

test("refund is once-only, owner-scoped, and a stale attempt cannot refund its retry", async () => {
  const row = await guest();
  const other = await guest();
  const input = request(row.ownerId);
  const first = await reserveEveGuestMessage(input);
  if (first.status !== "reserved") {
    throw new Error("Expected a reservation");
  }
  expect(
    await releaseEveGuestMessage(
      other.ownerId,
      input.operationId,
      first.reservationId
    )
  ).toBe(false);
  const releases = await Promise.all(
    Array.from(
      { length: 6 },
      async () =>
        await releaseEveGuestMessage(
          row.ownerId,
          input.operationId,
          first.reservationId
        )
    )
  );
  expect(releases.filter(Boolean)).toHaveLength(1);
  expect(await rateCounts(input.ipHash)).toEqual([0, 0]);
  const retry = await reserveEveGuestMessage(input);
  if (retry.status !== "reserved") {
    throw new Error("Expected a retry reservation");
  }
  expect(retry.reservationId).not.toBe(first.reservationId);
  expect(
    await releaseEveGuestMessage(
      row.ownerId,
      input.operationId,
      first.reservationId
    )
  ).toBe(false);
  expect(
    await commitEveGuestMessage(
      row.ownerId,
      input.operationId,
      retry.reservationId
    )
  ).toBe(true);
  expect(
    await releaseEveGuestMessage(
      row.ownerId,
      input.operationId,
      retry.reservationId
    )
  ).toBe(false);
});

test("committing and releasing the same attempt are mutually exclusive", async () => {
  const row = await guest();
  const input = request(row.ownerId);
  const held = await reserveEveGuestMessage(input);
  if (held.status !== "reserved") {
    throw new Error("Expected a reservation");
  }
  const results = await Promise.all([
    commitEveGuestMessage(row.ownerId, input.operationId, held.reservationId),
    releaseEveGuestMessage(row.ownerId, input.operationId, held.reservationId),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await rateCounts(input.ipHash)).toEqual(results[0] ? [1, 1] : [0, 0]);
});

test("guest provider accounting survives expiry and replay without creating monetary credit", async () => {
  const row = await guest();
  await db
    .update(eveGuest)
    .set({ expiresAt: new Date(0) })
    .where(eq(eveGuest.ownerId, row.ownerId));
  const evidence = {
    eventId: crypto.randomUUID(),
    ownerId: row.ownerId,
    sessionId: crypto.randomUUID(),
    turnId: "turn_0",
  };
  expect(await recordEveUsage(evidence)).toBe(false);
  await Promise.all(
    Array.from(
      { length: 6 },
      async () => await recordEveUsage({ ...evidence, costUsd: 0.002 })
    )
  );
  const rows = await db
    .select()
    .from(eveUsage)
    .where(eq(eveUsage.eventId, evidence.eventId));
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].costUsd)).toBe(0.002);
  expect(rows[0].chargedCents).toBe(0);
  expect(
    await db.select().from(userCredit).where(eq(userCredit.userId, row.ownerId))
  ).toEqual([]);
});

test("first admission creates one guest and reserves once across different IPs", async () => {
  const credential = createEveGuestCredential();
  const ownerId = eveGuestOwnerId(credential.tokenHash);
  owners.push(ownerId);
  const input = request(ownerId);
  const bootstrap = {
    expiresAt: new Date(Date.now() + 60_000),
    tokenHash: credential.tokenHash,
  };
  const attempts = await Promise.all(
    Array.from({ length: 6 }, async () => {
      const other = request(ownerId);
      return await reserveEveGuestMessage(
        { ...input, ipHash: other.ipHash },
        bootstrap
      );
    })
  );
  expect(
    attempts.filter((result) => result.status === "reserved")
  ).toHaveLength(1);
  expect(attempts.filter((result) => result.status === "replay")).toHaveLength(
    5
  );
  const bootstrappedGuest = await findEveGuest(credential.tokenHash);
  expect(bootstrappedGuest?.ownerId).toBe(ownerId);
  expect(await db.select().from(user).where(eq(user.id, ownerId))).toHaveLength(
    1
  );
  expect(
    await db.select().from(userCredit).where(eq(userCredit.userId, ownerId))
  ).toEqual([]);
});

test.each(["minute", "month"])(
  "denied first admission for %s creates no account or quota rows",
  async (denial) => {
    const credential = createEveGuestCredential();
    const ownerId = eveGuestOwnerId(credential.tokenHash);
    owners.push(ownerId);
    const input = request(ownerId);
    const result = await reserveEveGuestMessage(
      {
        ...input,
        requestsPerMinute: denial === "minute" ? 0 : 100,
        requestsPerMonth: denial === "month" ? 0 : 100,
      },
      {
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: credential.tokenHash,
      }
    );
    expect(result.status).toBe("rate-limited");
    expect(await findEveGuest(credential.tokenHash)).toBeUndefined();
    expect(await db.select().from(user).where(eq(user.id, ownerId))).toEqual(
      []
    );
    expect(
      await db
        .select()
        .from(eveGuestRate)
        .where(eq(eveGuestRate.ipHash, input.ipHash))
    ).toEqual([]);
  }
);

test("bootstrap cannot replace an expired identity or reset IP limits", async () => {
  const row = await guest();
  const input = { ...request(row.ownerId), requestsPerMinute: 1 };
  await reserveEveGuestMessage(input);
  const bootstrap = {
    expiresAt: new Date(Date.now() + 60_000),
    tokenHash: row.tokenHash,
  };
  const expiredBootstrapReservation = await reserveEveGuestMessage(
    { ...input, operationId: crypto.randomUUID() },
    bootstrap
  );
  expect(expiredBootstrapReservation.status).toBe("rate-limited");
  await db
    .update(eveGuest)
    .set({ expiresAt: new Date(0) })
    .where(eq(eveGuest.ownerId, row.ownerId));
  const repeatedBootstrapReservation = await reserveEveGuestMessage(
    { ...input, operationId: crypto.randomUUID() },
    bootstrap
  );
  expect(repeatedBootstrapReservation.status).toBe("unavailable");
  await expect(
    reserveEveGuestMessage(request(crypto.randomUUID()), bootstrap)
  ).rejects.toThrow("Invalid guest admission");
});

test("comparison admission rolls back a fresh account when any candidate exceeds quota", async () => {
  const credential = createEveGuestCredential();
  const ownerId = eveGuestOwnerId(credential.tokenHash);
  owners.push(ownerId);
  const first = { ...request(ownerId), requestsPerMinute: 1 };
  const result = await reserveEveGuestMessages(
    [first, { ...first, operationId: crypto.randomUUID() }],
    {
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: credential.tokenHash,
    }
  );
  expect(result).toEqual({ status: "rate-limited" });
  expect(await db.select().from(user).where(eq(user.id, ownerId))).toEqual([]);
  expect(
    await db
      .select()
      .from(eveGuestMessage)
      .where(eq(eveGuestMessage.ownerId, ownerId))
  ).toEqual([]);
  expect(
    await db
      .select()
      .from(eveGuestRate)
      .where(eq(eveGuestRate.ipHash, first.ipHash))
  ).toEqual([]);
});

test("failed mixed replay/new comparison leaves prior admission intact and rolls back new debits", async () => {
  const row = await guest();
  const first = { ...request(row.ownerId), requestsPerMinute: 2 };
  const accepted = await reserveEveGuestMessage(first);
  expect(accepted.status).toBe("reserved");
  const result = await reserveEveGuestMessages([
    first,
    { ...first, operationId: crypto.randomUUID() },
    { ...first, operationId: crypto.randomUUID() },
  ]);
  expect(result).toEqual({ status: "rate-limited" });
  expect(await reserveEveGuestMessage(first)).toEqual({
    ...accepted,
    status: "replay",
  });
  const entries = await db
    .select()
    .from(eveGuestMessage)
    .where(eq(eveGuestMessage.ownerId, row.ownerId));
  expect(entries).toHaveLength(1);
  const ipQuotaRowsAfterRollback = await db
    .select()
    .from(eveGuestRate)
    .where(eq(eveGuestRate.ipHash, first.ipHash));
  expect(
    ipQuotaRowsAfterRollback.map(
      (bucket: { readonly requests: number }) => bucket.requests
    )
  ).toEqual([1, 1]);
});

test("concurrent comparison retries debit each distinct candidate exactly once", async () => {
  const row = await guest();
  const first = request(row.ownerId);
  const inputs = [first, { ...first, operationId: crypto.randomUUID() }];
  const results = await Promise.all(
    Array.from({ length: 4 }, async () => await reserveEveGuestMessages(inputs))
  );
  for (const result of results) {
    expect(result.status).toBe("admitted");
    if (result.status !== "admitted") {
      throw new Error("Comparison admission failed.");
    }
    expect(
      result.reservations.map(
        (
          entry: Readonly<{
            operationId: string;
            reservationId: string;
            status: "reserved" | "replay";
          }>
        ) => entry.operationId
      )
    ).toEqual(
      inputs.map(
        (
          entry: Readonly<{
            ipHash: string;
            operationId: string;
            ownerId: string;
            requestHash: string;
            requestsPerMinute: number;
            requestsPerMonth: number;
          }>
        ) => entry.operationId
      )
    );
  }
  expect(
    results.filter(
      (
        result:
          | Readonly<{
              status: "admitted";
              reservations: readonly Readonly<{
                operationId: string;
                reservationId: string;
                status: "reserved" | "replay";
              }>[];
            }>
          | Readonly<{
              status: Exclude<(typeof results)[number]["status"], "admitted">;
            }>
      ) =>
        result.status === "admitted" &&
        result.reservations.every(
          (
            entry: Readonly<{
              operationId: string;
              reservationId: string;
              status: "reserved" | "replay";
            }>
          ) => entry.status === "reserved"
        )
    )
  ).toHaveLength(1);
  const ipQuotaRowsAfterComparison = await db
    .select()
    .from(eveGuestRate)
    .where(eq(eveGuestRate.ipHash, first.ipHash));
  expect(
    ipQuotaRowsAfterComparison.map(
      (bucket: { readonly requests: number }) => bucket.requests
    )
  ).toEqual([2, 2]);
});

test("comparison rate limits roll back all candidates and reject duplicate operation IDs", async () => {
  const row = await guest();
  const first = { ...request(row.ownerId), requestsPerMinute: 1 };
  expect(
    await reserveEveGuestMessages([
      first,
      { ...first, operationId: crypto.randomUUID() },
    ])
  ).toEqual({ status: "rate-limited" });
  expect(
    await db
      .select()
      .from(eveGuestMessage)
      .where(eq(eveGuestMessage.ownerId, row.ownerId))
  ).toEqual([]);
  await expect(reserveEveGuestMessages([first, first])).rejects.toThrow(
    "unique operations"
  );
  await expect(
    reserveEveGuestMessages([
      first,
      { ...first, operationId: first.operationId.toUpperCase() },
    ])
  ).rejects.toThrow("unique operations");
});

test("comparison persistence failure rolls back guest identity and every quota reservation", async () => {
  const credential = createEveGuestCredential();
  const ownerId = eveGuestOwnerId(credential.tokenHash);
  owners.push(ownerId);
  const first = request(ownerId);
  const input = {
    fork: { conversationId: crypto.randomUUID() },
    message: "hello",
    modelIds: ["cheap", "cheap"],
    operationId: crypto.randomUUID(),
  };
  const candidates = eveResponseGroupCandidates(
    input.operationId,
    input.modelIds
  );
  await expect(
    reserveEveGuestMessages(
      candidates.map(
        (candidate: Readonly<{ modelId: string; operationId: string }>) => ({
          ...first,
          operationId: candidate.operationId,
        })
      ),
      {
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash: credential.tokenHash,
      },
      async (tx) =>
        await reserveEveResponseGroupInTransaction(tx, ownerId, input)
    )
  ).rejects.toThrow("Source conversation not found");
  expect(await db.select().from(user).where(eq(user.id, ownerId))).toEqual([]);
  expect(
    await db
      .select()
      .from(eveGuestMessage)
      .where(eq(eveGuestMessage.ownerId, ownerId))
  ).toEqual([]);
  expect(
    await db
      .select()
      .from(eveGuestRate)
      .where(eq(eveGuestRate.ipHash, first.ipHash))
  ).toEqual([]);
});

test("refunded guest creation cannot dispatch late, while a new admission can recover", async () => {
  const row = await guest();
  const input = request(row.ownerId);
  const original = await reserveEveGuestMessage(input);
  if (original.status !== "reserved") {
    throw new Error("Missing admission");
  }
  expect(
    await releaseEveGuestCreation(
      row.ownerId,
      input.operationId,
      original.reservationId
    )
  ).toBe(true);
  const dispatch = vi
    .fn<() => Promise<string>>()
    .mockResolvedValue(`native-${input.operationId}`);
  await expect(
    createEveConversation(row.ownerId, input.operationId, "hello", dispatch, {
      guestReservationId: original.reservationId,
    })
  ).rejects.toThrow("Guest admission has changed");
  await expect(
    createEveConversation(row.ownerId, input.operationId, "hello", dispatch)
  ).rejects.toThrow("requires a quota reservation");
  expect(dispatch).not.toHaveBeenCalled();
  const retry = await reserveEveGuestMessage(input);
  if (retry.status !== "reserved") {
    throw new Error("Missing retry admission");
  }
  const binding = await createEveConversation(
    row.ownerId,
    input.operationId,
    "hello",
    dispatch,
    { guestReservationId: retry.reservationId }
  );
  expect(binding.sessionId).toBe(`native-${input.operationId}`);
  expect(
    await releaseEveGuestCreation(
      row.ownerId,
      input.operationId,
      retry.reservationId
    )
  ).toBe(false);
  expect(dispatch).toHaveBeenCalledTimes(1);
});

test.each([0, 1, 2, 3])(
  "creation claims and refunds serialize without a free native dispatch (attempt %i)",
  async () => {
    const row = await guest();
    const input = request(row.ownerId);
    const quota = await reserveEveGuestMessage(input);
    if (quota.status !== "reserved") {
      throw new Error("Missing admission");
    }
    const dispatch = vi
      .fn<() => Promise<string>>()
      .mockResolvedValue(`native-race-${input.operationId}`);
    const [creation, refund] = await Promise.allSettled([
      createEveConversation(row.ownerId, input.operationId, "hello", dispatch, {
        guestReservationId: quota.reservationId,
      }),
      releaseEveGuestCreation(
        row.ownerId,
        input.operationId,
        quota.reservationId
      ),
    ]);
    expect(refund.status).toBe("fulfilled");
    if (refund.status !== "fulfilled") {
      throw new Error("Refund failed");
    }
    if (refund.value) {
      expect(creation.status).toBe("rejected");
      expect(dispatch).not.toHaveBeenCalled();
      expect(await rateCounts(input.ipHash)).toEqual([0, 0]);
    } else {
      expect(creation.status).toBe("fulfilled");
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(await rateCounts(input.ipHash)).toEqual([1, 1]);
    }
  }
);

test("committed quota without a creation journal cannot authorize a new dispatch", async () => {
  const row = await guest();
  const input = request(row.ownerId);
  const quota = await reserveEveGuestMessage(input);
  if (quota.status !== "reserved") {
    throw new Error("Missing admission");
  }
  await commitEveGuestMessage(
    row.ownerId,
    input.operationId,
    quota.reservationId
  );
  const dispatch = vi
    .fn<() => Promise<string>>()
    .mockResolvedValue(`native-${input.operationId}`);
  await expect(
    createEveConversation(row.ownerId, input.operationId, "hello", dispatch, {
      guestReservationId: quota.reservationId,
    })
  ).rejects.toThrow("Committed guest admission has no creation journal");
  expect(dispatch).not.toHaveBeenCalled();
});
