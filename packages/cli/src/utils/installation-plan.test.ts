import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import path from "node:path";
import { tmpdir } from "node:os";

import { toolDefinitionSchema } from "../../../registry/metadata";

import { planInstallation } from "./installation-plan";

const roots: string[] = [];
afterEach(async (): Promise<void> => {
  await Promise.all(
    roots.splice(0).map(async (root): Promise<void> => {
      await rm(root, { force: true, recursive: true });
    })
  );
});

test("plans transitive dependencies and repairs against the complete resulting installation without writing", async (): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), "chatjs-plan-"));
  roots.push(root);
  const reader = toolDefinitionSchema.parse({
    contractVersion: 1,
    id: "read-document",
    kind: "tool",
    tools: [{ toolExport: "readDocument" }],
  });
  const documents = toolDefinitionSchema.parse({
    contractVersion: 1,
    documentKind: "text",
    id: "text-documents",
    kind: "tool",
    requiresTools: ["readDocument"],
    tools: [{ toolExport: "createTextDocument" }],
  });
  const server = Bun.serve({
    fetch(request: Readonly<Pick<Request, "url">>): Response {
      const isReader = new URL(request.url).pathname.includes("read-document");
      const definition = isReader ? reader : documents;
      return Response.json({
        meta: { chatjs: definition },
        name: definition.id,
        registryDependencies: isReader
          ? []
          : [`http://127.0.0.1:${server.port}/read-document.json`],
        type: "registry:item",
      });
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  try {
    const source = `http://127.0.0.1:${server.port}`;
    // oxlint-disable-next-line typescript/await-thenable, typescript/no-confusing-void-expression -- Await the asynchronous Bun matcher before checking that planning made no writes.
    await expect(
      planInstallation(
        root,
        {
          features: [],
          tools: [`${source}/text-documents.json`],
        },
        { documents: false, fresh: true }
      )
    ).rejects.toThrow("--no-documents");
    expect(await Bun.file(path.join(root, "package.json")).exists()).toBe(
      false
    );
    const first = await planInstallation(root, {
      features: [],
      tools: [`${source}/text-documents.json`],
    });
    expect(
      first.expected
        .map((item: { readonly id: string }): string => item.id)
        .toSorted()
    ).toEqual(["read-document", "text-documents"]);
    expect(
      await Bun.file(path.join(root, "tools/chatjs/tools.ts")).exists()
    ).toBe(false);
    const dir = path.join(root, "tools/chatjs/text-documents");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "chatjs.json"), JSON.stringify(documents));
    await writeFile(
      path.join(dir, "document.tsx"),
      "export const documentUi = {};\n"
    );
    await writeFile(
      path.join(dir, "tool.ts"),
      "export const createTextDocument = {};\n"
    );
    expect(planInstallation(root, { features: [], tools: [] })).rejects.toThrow(
      "requires installed tools: readDocument"
    );
    const repair = await planInstallation(root, {
      features: [],
      tools: [`${source}/read-document.json`],
    });
    expect(repair.expected).toEqual([reader]);
    expect(await readFile(path.join(dir, "tool.ts"), "utf-8")).toContain(
      "createTextDocument"
    );
  } finally {
    await server.stop(true);
  }
});

test("validates feature dependencies and exclusive storage slots before writing", async (): Promise<void> => {
  const root = await mkdtemp(path.join(tmpdir(), "chatjs-plan-feature-"));
  roots.push(root);
  const server = Bun.serve({
    fetch(request: Readonly<Pick<Request, "url">>): Response {
      const name = new URL(request.url).pathname.slice(1).replace(".json", "");
      const chatjs =
        name === "langfuse"
          ? {
              contractVersion: 1,
              id: "langfuse",
              kind: "feature",
              requiresFeatures: ["mcp"],
            }
          : {
              contractVersion: 1,
              id: name,
              kind: name === "mcp" ? "feature" : "storage",
            };
      return Response.json({
        meta: { chatjs },
        name,
        registryDependencies:
          name === "first"
            ? [`http://127.0.0.1:${server.port}/second.json`]
            : [],
        type: "registry:item",
      });
    },
    hostname: "127.0.0.1",
    port: 0,
  });
  const source = `http://127.0.0.1:${server.port}`;
  try {
    expect(
      planInstallation(root, {
        features: [`${source}/langfuse.json`],
        tools: [],
      })
    ).rejects.toThrow("requires installed features: mcp");
    const plan = await planInstallation(root, {
      features: [`${source}/mcp.json`, `${source}/langfuse.json`],
      tools: [],
    });
    expect(
      plan.features
        .map((feature: { readonly id: string }): string => feature.id)
        .toSorted()
    ).toEqual(["langfuse", "mcp"]);
    expect(
      planInstallation(root, {
        features: [`${source}/mcp.json`],
        gateway: `${source}/mcp.json`,
        tools: [],
      })
    ).rejects.toThrow("Selected gateway item has incompatible ChatJS metadata");
    const dir = path.join(root, "features/mcp");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "chatjs.json"),
      JSON.stringify({ contractVersion: 1, id: "mcp", kind: "feature" })
    );
    expect(
      planInstallation(root, {
        features: [`${source}/langfuse.json`],
        tools: [],
      })
    ).resolves.toMatchObject({ features: [{ id: "langfuse" }] });
    expect(
      planInstallation(root, {
        features: [],
        storage: { options: {}, source: `${source}/first.json` },
        tools: [],
      })
    ).rejects.toThrow("Only one storage provider");
    expect(
      await Bun.file(path.join(root, "features/installed-routers.ts")).exists()
    ).toBe(false);
  } finally {
    await server.stop(true);
  }
});
