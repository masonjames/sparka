import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  route:
    vi.fn<
      (
        request: Request,
        context: { params: { sessionId: string } }
      ) => Promise<Response>
    >(),
  manage: vi.fn(),
  auth: vi.fn().mockResolvedValue({ ownerId: "owner" }),
  config: { persistentSandbox: "app" },
}));
vi.mock("../config", () => ({ config: mocks.config }));
vi.mock("./gateway-auth", () => ({ authenticateEveGateway: mocks.auth }));
vi.mock("eve/sandbox/microsandbox", () => ({
  manageLocalMicrosandboxResources: mocks.manage,
}));
vi.mock("eve/channels", () => ({
  POST: (
    _path: string,
    handler: (
      request: Request,
      context: { params: { sessionId: string } }
    ) => Promise<Response>
  ) => mocks.route.mockImplementation(handler),
}));

it("never certifies Vercel resource cleanup using a Microsandbox inventory", async () => {
  await import("./local-resource-route");
  const response = await mocks.route(
    new Request("http://localhost/eve/v1/session/session/local-resources", {
      method: "POST",
      headers: { "x-chatjs-deletion": "1" },
      body: JSON.stringify({ expectedAppRoot: "/fixture", action: "purge" }),
    }),
    { params: { sessionId: "session" } }
  );
  expect(response.status).toBe(501);
  expect(mocks.manage).not.toHaveBeenCalled();
});
