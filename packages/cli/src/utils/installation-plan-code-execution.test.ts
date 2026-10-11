import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import path from "node:path";
import { tmpdir } from "node:os";

import { toolDefinitionSchema } from "../../../registry/metadata";

import { planInstallation } from "./installation-plan";

const roots: string[] = [];
/* oxlint-disable typescript/promise-function-async -- Return the existing promise directly to preserve its identity and the current synchronous-throw boundary. */
afterEach(async (): Promise<void> => {
  await Promise.all(
    roots
      .splice(0)
      .map((root): Promise<void> => rm(root, { force: true, recursive: true }))
  );
});
/* oxlint-enable typescript/promise-function-async */

const definition = (
  id: string
): ReturnType<typeof toolDefinitionSchema.parse> =>
  toolDefinitionSchema.parse({
    codeExecutionCapabilities: {
      cancellation: "terminate",
      cleanup: "durable-allocation",
      files: "ephemeral",
      languages: ["python", "javascript"],
      timeout: "bounded",
      usage: "single-receipt",
    },
    codeExecutorExport: "executeCode",
    contractVersion: 1,
    id,
    kind: "tool",
    slot: "codeExecution",
    tools: [{ toolExport: "executeCode" }],
  });

test("rejects conflicting provider selections and permits reinstalling the selected provider", async (): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), "chatjs-plan-provider-"));
  roots.push(root);
  const directory = path.join(root, "tools/chatjs/first");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "chatjs.json"),
    JSON.stringify(definition("first"))
  );
  await writeFile(
    path.join(directory, "tool.ts"),
    "export const executeCode = {};\n"
  );
  const server = Bun.serve({
    fetch(request: Readonly<Pick<Request, "url">>): Response {
      const id = new URL(request.url).pathname.includes("second")
        ? "second"
        : "first";
      return Response.json({
        meta: { chatjs: definition(id) },
        name: id,
        type: "registry:item",
      });
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  try {
    // oxlint-disable-next-line typescript/await-thenable, typescript/no-confusing-void-expression -- Await the asynchronous matcher before advancing the test; Bun matcher declarations expose a void result.
    await expect(
      planInstallation(root, {
        features: [],
        tools: [`http://127.0.0.1:${server.port}/second.json`],
      })
    ).rejects.toThrow("Only one codeExecution");
    const fresh = await planInstallation(
      root,
      {
        features: [],
        tools: [`http://127.0.0.1:${server.port}/second.json`],
      },
      { fresh: true }
    );
    expect(
      fresh.replacements.map(
        ({
          previous,
        }: {
          readonly previous: { readonly id: string };
        }): string => previous.id
      )
    ).toEqual([]);
    const reinstall = await planInstallation(root, {
      features: [],
      tools: [`http://127.0.0.1:${server.port}/first.json`],
    });
    expect(reinstall.expected).toEqual([definition("first")]);
  } finally {
    await server.stop(true);
  }
});

/* oxlint-disable typescript/await-thenable, typescript/no-confusing-void-expression -- Bun rejection matchers are awaited despite their void declarations. */
test("replaces an older executor descriptor but rejects newly requested providers without capabilities", async (): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), "chatjs-executor-upgrade-"));
  roots.push(root);
  const old = definition("previous-executor");
  const { codeExecutionCapabilities, ...oldDescriptor } = old;
  expect(codeExecutionCapabilities).toBeDefined();
  const directory = path.join(root, "tools/chatjs/previous-executor");
  await mkdir(directory, { recursive: true });
  const installed = JSON.stringify(oldDescriptor);
  await writeFile(path.join(directory, "chatjs.json"), installed);
  await writeFile(
    path.join(directory, "tool.ts"),
    "export const executeCode = {};\n"
  );
  let declared = true;
  const server = Bun.serve({
    fetch(): Response {
      const complete = definition("next-executor");
      const { codeExecutionCapabilities: capabilities, ...incomplete } =
        complete;
      return Response.json({
        meta: {
          chatjs: declared
            ? { ...incomplete, codeExecutionCapabilities: capabilities }
            : incomplete,
        },
        name: complete.id,
        type: "registry:item",
      });
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  try {
    const selection = {
      features: [],
      tools: [`http://127.0.0.1:${server.port}/executor.json`],
    };
    const planned = await planInstallation(root, selection, { replace: true });
    expect(
      planned.replacements.map(
        ({
          previous,
        }: Readonly<{ previous: Readonly<{ id: string }> }>): string =>
          previous.id
      )
    ).toEqual([old.id]);
    declared = false;
    await expect(
      planInstallation(root, selection, { replace: true })
    ).rejects.toThrow("declared execution, cleanup and usage capabilities");
    expect(await readFile(path.join(directory, "chatjs.json"), "utf-8")).toBe(
      installed
    );
  } finally {
    await server.stop(true);
  }
});
/* oxlint-enable typescript/await-thenable, typescript/no-confusing-void-expression */
