import { expect, it, vi } from "vitest";

import { localDeletionAvailable } from "./local-deletion-available";

const { env, config } = vi.hoisted(() => ({
  config: { persistentSandboxProvider: "auto" },
  env: {
    EVE_INTERNAL_ORIGIN: "http://localhost:3000",
    VERCEL: "",
    VERCEL_ENV: "production",
    WORKFLOW_POSTGRES_URL: "postgres://localhost/workflow",
  },
}));
vi.mock("../env", () => ({ env }));
vi.mock("../config", () => ({ config }));

it("allows loopback PostgreSQL deletion but rejects it on managed Vercel", () => {
  expect(localDeletionAvailable()).toBe(true);
  env.VERCEL = "1";
  expect(localDeletionAvailable()).toBe(false);
});

it("does not advertise Microsandbox cleanup for explicit Vercel sessions", () => {
  env.VERCEL = "";
  config.persistentSandboxProvider = "vercel";
  expect(localDeletionAvailable()).toBe(false);
});
