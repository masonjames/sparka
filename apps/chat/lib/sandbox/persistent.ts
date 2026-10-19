import type {
  PersistentSandbox,
  PersistentSandboxProvider,
} from "@chat-js/sandboxes/persistent";
import { APIError, Sandbox } from "@vercel/sandbox";
import pathModule from "node:path";
import type { SandboxAuth } from "./adapter";

const { posix } = pathModule;

const OPERATION_TIMEOUT_MS = 30_000;
const SESSION_TIMEOUT_MS = 1_800_000;
const NOT_FOUND = 404;
const resolvePath = (path: string): string => posix.resolve("/workspace", path);
const signal = (): AbortSignal => AbortSignal.timeout(OPERATION_TIMEOUT_MS);

const session = (sandbox: Sandbox): PersistentSandbox => {
  const read: PersistentSandbox["readBinaryFile"] = async (options) =>
    await sandbox.readFileToBuffer(
      { path: resolvePath(options.path) },
      { signal: options.abortSignal ?? signal() }
    );
  const write: PersistentSandbox["writeBinaryFile"] = async (options) => {
    const path = resolvePath(options.path);
    await sandbox.fs.mkdir(posix.dirname(path), {
      recursive: true,
      signal: options.abortSignal ?? signal(),
    });
    await sandbox.writeFiles(
      [{ path, content: Buffer.from(options.content) }],
      { signal: options.abortSignal ?? signal() }
    );
  };
  return {
    name: sandbox.name,
    resolvePath,
    readBinaryFile: read,
    writeBinaryFile: write,
    async readFile(options) {
      const bytes = await read(options);
      return bytes === null
        ? null
        : new ReadableStream({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          });
    },
    async readTextFile(options) {
      const bytes = await read(options);
      if (bytes === null) {
        return null;
      }
      const text = new TextDecoder(options.encoding ?? "utf-8", {
        fatal: true,
      }).decode(bytes);
      if (options.startLine === undefined && options.endLine === undefined) {
        return text;
      }
      return text
        .split("\n")
        .slice(Math.max(0, (options.startLine ?? 1) - 1), options.endLine)
        .join("\n");
    },
    async writeFile(options) {
      const bytes = new Uint8Array(
        await new Response(options.content).arrayBuffer()
      );
      await write({ ...options, content: bytes });
    },
    async writeTextFile(options) {
      const encoding = options.encoding ?? "utf-8";
      if (!Buffer.isEncoding(encoding)) {
        throw new Error("Unsupported sandbox text encoding.");
      }
      await write({
        ...options,
        content: Buffer.from(options.content, encoding),
      });
    },
    async removePath(options) {
      await sandbox.fs.rm(resolvePath(options.path), {
        force: options.force,
        recursive: options.recursive,
        signal: options.abortSignal ?? signal(),
      });
    },
    async run(options) {
      const result = await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", options.command],
        cwd: resolvePath(options.workingDirectory ?? "."),
        env: options.env,
        signal: options.abortSignal ?? signal(),
      });
      const [stdout, stderr] = await Promise.all([
        result.stdout(),
        result.stderr(),
      ]);
      return { exitCode: result.exitCode, stdout, stderr };
    },
    async spawn(options) {
      const command = await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", options.command],
        cwd: resolvePath(options.workingDirectory ?? "."),
        env: options.env,
        signal: options.abortSignal ?? signal(),
        detached: true,
      });
      // Consume the multiplexed stream once; tee preserves output for either reader.
      const iterator = command.logs()[Symbol.asyncIterator]();
      interface Log {
        stream: "stdout" | "stderr";
        data: string;
      }
      const logs = new ReadableStream<Log>({
        async pull(controller) {
          try {
            const next = await iterator.next();
            if (next.done === true) {
              controller.close();
            } else {
              controller.enqueue(next.value);
            }
          } catch (error) {
            controller.error(error);
          }
        },
        async cancel() {
          await iterator.return?.();
        },
      });
      const [out, err] = logs.tee();
      const encoder = new TextEncoder();
      const stdout = out.pipeThrough(
        new TransformStream<Log, Uint8Array>({
          transform(log, controller) {
            if (log.stream === "stdout") {
              controller.enqueue(encoder.encode(log.data));
            }
          },
        })
      );
      const stderr = err.pipeThrough(
        new TransformStream<Log, Uint8Array>({
          transform(log, controller) {
            if (log.stream === "stderr") {
              controller.enqueue(encoder.encode(log.data));
            }
          },
        })
      );
      return {
        stdout,
        stderr,
        async wait() {
          const result = await command.wait();
          return { exitCode: result.exitCode };
        },
        async kill() {
          await command.kill();
        },
      };
    },
  };
};

/** The original credential scope must be verified by the durable owner before use. */
export const createPersistentProvider = (
  auth: SandboxAuth
): PersistentSandboxProvider => {
  const find = async (name: string): Promise<Sandbox | null> => {
    try {
      const sandbox = await Sandbox.get({
        name,
        resume: false,
        signal: signal(),
        ...auth,
      });
      if (sandbox.name !== name || !sandbox.persistent) {
        throw new Error("Persistent sandbox identity mismatch.");
      }
      return sandbox;
    } catch (error) {
      if (error instanceof APIError && error.response.status === NOT_FOUND) {
        return null;
      }
      throw error;
    }
  };
  return {
    async create({ name, signal: abortSignal }) {
      const sandbox = await Sandbox.create({
        name,
        persistent: true,
        image: "vcr.vercel.com/vercel/eve/base:0.80.1",
        timeout: SESSION_TIMEOUT_MS,
        signal: abortSignal,
        ...auth,
      });
      if (sandbox.name !== name || !sandbox.persistent) {
        throw new Error("Persistent sandbox identity mismatch.");
      }
      return session(sandbox);
    },
    async open(name) {
      const sandbox = await find(name);
      if (sandbox === null) {
        throw new Error(
          "Persistent sandbox is missing; replacement is forbidden."
        );
      }
      return session(sandbox);
    },
    async stop(name) {
      const sandbox = await find(name);
      if (sandbox !== null) {
        await sandbox.stop({ signal: signal() });
      }
    },
    async deleteAndConfirmAbsent(name) {
      const sandbox = await find(name);
      if (sandbox !== null) {
        await sandbox.delete({ deleteOrphanSnapshots: true, signal: signal() });
      }
      if (await find(name)) {
        throw new Error("Persistent sandbox deletion is unconfirmed.");
      }
    },
  };
};
