import { afterEach, expect, it, vi } from "vitest";

import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";

import {
  CreationRejectedError,
  requestConversation,
} from "./create-conversation";

const operation = {
  message: "yo",
  operationId: "00000000-0000-4000-8000-000000000001",
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/* oxlint-disable typescript/promise-function-async --
 * typescript/promise-function-async (#606): it("aborts a stalled creation without resending or changing its operation") preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 */
it("aborts a stalled creation without resending or changing its operation", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn(
    (_url: string, init: ReadonlyNativeSurface<RequestInit>) =>
      // oxlint-disable-next-line promise/avoid-new -- Bridge the timer or abort callback to the awaited operation.
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => {
            // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- The fetch mock forwards the abort reason so the timeout test observes the original cancellation error.
            reject(init.signal?.reason);
          },
          { once: true }
        );
      })
  );
  vi.stubGlobal("fetch", fetchMock);
  const result = expect(requestConversation(operation)).rejects.toThrow(
    "timed out"
  );
  await vi.advanceTimersByTimeAsync(30_000);
  await result;
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0]?.[1].body).toBe(JSON.stringify(operation));
});
/* oxlint-enable typescript/promise-function-async */

it("returns the existing binding on retry and clears its deadline", async () => {
  vi.useFakeTimers();
  const binding = { id: operation.operationId, sessionId: "session-test" };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(binding)));
  await expect(requestConversation(operation)).resolves.toEqual(binding);
  expect(vi.getTimerCount()).toBe(0);
});

it.each([400, 404])(
  "distinguishes definitive rejection (%i) from uncertain creation",
  async (status) => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { creationRejected: true, error: "Unavailable" },
            { status }
          )
        )
    );
    await expect(requestConversation(operation)).rejects.toBeInstanceOf(
      CreationRejectedError
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "Unresolved" }, { status: 409 })
        )
    );
    await expect(requestConversation(operation)).rejects.not.toBeInstanceOf(
      CreationRejectedError
    );
  }
);

it("identifies a missing project only on a definitive rejection", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json(
        {
          code: "project_not_found",
          creationRejected: true,
          error: "Project not found",
        },
        { status: 404 }
      )
    )
  );
  await expect(requestConversation(operation)).rejects.toMatchObject({
    projectUnavailable: true,
  });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { creationRejected: true, error: "Invalid model" },
          { status: 400 }
        )
      )
  );
  await expect(requestConversation(operation)).rejects.toMatchObject({
    projectUnavailable: false,
  });
});
it("automatically retries busy creation with the same operation identity", async () => {
  vi.useFakeTimers();
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json(
        { code: "usage_reconciliation_busy", error: "Busy" },
        { status: 503 }
      )
    )
    .mockResolvedValueOnce(
      Response.json({ id: operation.operationId, sessionId: "session" })
    );
  vi.stubGlobal("fetch", fetchMock);
  const result = requestConversation(operation);
  await vi.advanceTimersByTimeAsync(2000);
  await expect(result).resolves.toMatchObject({ sessionId: "session" });
  expect(fetchMock).toHaveBeenCalledTimes(2);

  expect(
    fetchMock.mock.calls.map(
      ([, init]: Readonly<(typeof fetchMock.mock.calls)[number]>) =>
        /* oxlint-disable typescript/no-unsafe-return, typescript/no-unsafe-member-access -- #598: This create-conversation fixture inspects controlled mock or JSON payloads; fully modeling the mock boundary requires a separate test-contract migration. #597: This create-conversation fixture inspects controlled mock or JSON payloads; fully modeling the mock boundary requires a separate test-contract migration. */
        init.body
      /* oxlint-enable typescript/no-unsafe-return, typescript/no-unsafe-member-access */
    )
  ).toEqual([JSON.stringify(operation), JSON.stringify(operation)]);
});
