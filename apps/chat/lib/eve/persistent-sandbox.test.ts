import { beforeEach, expect, it, vi } from "vitest";
import type { SandboxProviderSessionContext } from "eve/sandbox/provider";
import type { accessPersistentSandbox } from "./persistent-sandbox-store";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  reserve: vi.fn(),
  access: vi.fn<typeof accessPersistentSandbox>(),
  read: vi.fn(),
  retire: vi.fn(),
  cleanup: vi.fn(),
  create: vi.fn(),
  open: vi.fn(),
  stop: vi.fn(),
  remove: vi.fn(),
  write: vi.fn(),
  binding: vi.fn(),
}));
vi.mock("../sandbox/provider", () => ({ supportsPersistentSandbox: true }));
vi.mock("../env", () => ({ env: {} }));
vi.mock("../db/eve-queries", () => ({ readEveSessionMapping: mocks.binding }));
vi.mock("./persistent-sandbox-store", () => ({
  registerPersistentSession: mocks.register,
  reservePersistentSandbox: mocks.reserve,
  accessPersistentSandbox: mocks.access,
  readPersistentIdentity: mocks.read,
  retirePersistentSession: mocks.retire,
  cleanupPersistentSession: mocks.cleanup,
}));
vi.mock("../sandbox/runtime", () => ({
  getPersistentSandboxProvider: vi.fn(),
  getSandboxProvider: () => ({
    scope: { providerId: "vercel", accountId: "account", scopeId: "project" },
    persistent: {
      create: mocks.create,
      open: mocks.open,
      stop: mocks.stop,
      deleteAndConfirmAbsent: mocks.remove,
    },
  }),
}));
const { appSandboxProvider } = await import("./persistent-sandbox");
const implementation = appSandboxProvider();
const context: SandboxProviderSessionContext = {
  host: { resolveProjectPath: (path) => path, loadOptionalPackage: vi.fn() },
  storagePath: "/fixture",
  session: {
    id: "session",
    auth: { initiator: null, current: null },
    turn: { id: "turn", sequence: 0 },
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockResolvedValue({
    sessionId: "session",
    rootSessionId: "session",
    ownerId: "owner",
  });
  mocks.reserve.mockResolvedValue({ name: "resource", create: true });
  mocks.create.mockResolvedValue({
    name: "resource",
    writeBinaryFile: mocks.write,
  });
  mocks.open.mockResolvedValue({
    name: "resource",
    writeBinaryFile: mocks.write,
  });
  mocks.access.mockImplementation(
    async (_identity, _scope, _name, operation) => await operation()
  );
});
it("does not repeat remote create after a known allocation outlived EVE state persistence", async () => {
  mocks.reserve.mockResolvedValue({ name: "resource", create: false });
  await implementation.start(context, undefined, []);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.open).toHaveBeenCalledWith("resource");
});
it("leaves interrupted allocation fenced without issuing a replacement create", async () => {
  mocks.reserve.mockRejectedValue(new Error("allocation unresolved"));
  await expect(implementation.start(context, undefined, [])).rejects.toThrow(
    "unresolved"
  );
  expect(mocks.create).not.toHaveBeenCalled();
});
it("checks the durable fence again before using cached filesystem handles", async () => {
  const result = await implementation.start(context, undefined, []);
  mocks.access.mockRejectedValue(new Error("session retired"));
  await expect(
    result.handle.sandbox.writeBinaryFile({
      path: "file",
      content: new Uint8Array(),
    })
  ).rejects.toThrow("retired");
  expect(mocks.write).not.toHaveBeenCalled();
});
it("retires before deleting and keeps stop distinct from deletion", async () => {
  const result = await implementation.start(context, undefined, []);
  await result.handle.onSandboxStop();
  expect(mocks.stop).toHaveBeenCalledWith("resource");
  expect(mocks.retire).not.toHaveBeenCalled();
  await result.handle.onSandboxDelete();
  expect(mocks.retire.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.cleanup.mock.invocationCallOrder[0]
  );
});
