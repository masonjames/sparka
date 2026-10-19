import { defineSandboxProvider } from "eve/sandbox/provider";
import type {
  SandboxProviderImplementation,
  SandboxProviderSessionContext,
  SandboxProviderHandle,
} from "eve/sandbox/provider";
import type { SandboxEnvironment } from "eve/sandbox";
import type { PersistentSandbox } from "@chat-js/sandboxes/persistent";
import { z } from "zod";
import { env } from "../env";
import { getSandboxProvider } from "../sandbox/runtime";
import { readEveSessionMapping } from "../db/eve-queries";
import {
  accessPersistentSandbox,
  cleanupPersistentSession,
  readPersistentIdentity,
  reservePersistentSandbox,
  retirePersistentSession,
  registerPersistentSession,
} from "./persistent-sandbox-store";
import type { SessionIdentity } from "./persistent-sandbox-store";

const stateSchema = z.object({ name: z.string().min(1) });
type Files = { path: string; content: string }[];
const identityFor = async (
  context: Pick<SandboxProviderSessionContext, "session">
): Promise<SessionIdentity> => {
  if (
    env.NODE_ENV === "development" &&
    env.CHATJS_SANDBOX_DEV_RUN_ID === undefined
  ) {
    throw new Error(
      "App-owned persistent sandboxes require bun dev:supervise in development."
    );
  }
  const sessionId = context.session.id;
  const rootSessionId = context.session.parent?.rootSessionId ?? sessionId;
  const saved = await readPersistentIdentity(sessionId);
  const principal = context.session.auth.initiator?.principalId;
  const binding = saved
    ? null
    : await readEveSessionMapping({ sessionId: rootSessionId });
  const ownerId = principal ?? saved?.ownerId ?? binding?.ownerId;
  if (
    ownerId === undefined ||
    ownerId === "" ||
    (binding && binding.ownerId !== ownerId) ||
    (saved &&
      (saved.ownerId !== ownerId || saved.rootSessionId !== rootSessionId))
  ) {
    throw new Error("Persistent sandbox owner is unavailable or changed.");
  }
  return {
    sessionId,
    rootSessionId,
    ownerId,
    devRunId: env.CHATJS_SANDBOX_DEV_RUN_ID,
  };
};

const remove = async (identity: SessionIdentity): Promise<void> => {
  const infrastructure = getSandboxProvider();
  if (!infrastructure.persistent) {
    throw new Error("Persistent sandbox provider is unavailable.");
  }
  await retirePersistentSession(identity);
  await cleanupPersistentSession(
    identity,
    infrastructure.scope,
    infrastructure.persistent.deleteAndConfirmAbsent
  );
};

const handle = (
  identity: SessionIdentity,
  sandbox: PersistentSandbox
): SandboxProviderHandle<PersistentSandbox> => {
  const infrastructure = getSandboxProvider();
  const { persistent } = infrastructure;
  if (!persistent) {
    throw new Error("Persistent sandbox provider is unavailable.");
  }
  const access = async <T>(operation: () => Promise<T>): Promise<T> =>
    await accessPersistentSandbox(
      identity,
      infrastructure.scope,
      sandbox.name,
      operation
    );
  return {
    // Fence cached handles too: EVE may retain a handle after stop/delete.
    sandbox: {
      name: sandbox.name,
      resolvePath: sandbox.resolvePath,
      run: async (options) =>
        await access(async () => await sandbox.run(options)),
      spawn: async (options) =>
        await access(async () => await sandbox.spawn(options)),
      readFile: async (options) =>
        await access(async () => await sandbox.readFile(options)),
      readBinaryFile: async (options) =>
        await access(async () => await sandbox.readBinaryFile(options)),
      readTextFile: async (options) =>
        await access(async () => await sandbox.readTextFile(options)),
      writeFile: async (options) => {
        await access(async () => {
          await sandbox.writeFile(options);
        });
      },
      writeBinaryFile: async (options) => {
        await access(async () => {
          await sandbox.writeBinaryFile(options);
        });
      },
      writeTextFile: async (options) => {
        await access(async () => {
          await sandbox.writeTextFile(options);
        });
      },
      removePath: async (options) => {
        await access(async () => {
          await sandbox.removePath(options);
        });
      },
    },
    onSandboxDelete: async () => {
      await remove(identity);
    },
    onSandboxStop: async () => {
      await access(async () => {
        await persistent.stop(sandbox.name);
      });
    },
    onRuntimeShutdown: async () => {
      await access(async () => {
        await persistent.stop(sandbox.name);
      });
    },
  };
};

export const appSandboxProvider = (): SandboxProviderImplementation<
  undefined,
  Files,
  { name: string },
  PersistentSandbox
> => ({
  async prepare(context) {
    // Per-session preparation avoids shared remote snapshots and their retention graph.
    const files: Files = [];
    for (const tree of [
      context.resources.workspace,
      context.resources.skills,
    ]) {
      if (!tree) {
        continue;
      }
      for (const file of tree.files) {
        files.push({
          path: `${tree.targetPath}/${file.relativePath}`,
          content: Buffer.from(file.content).toString("base64"),
        });
      }
    }
    return await Promise.resolve(files);
  },
  async start(context, _options, artifact) {
    const identity = await identityFor(context);
    const infrastructure = getSandboxProvider();
    const { persistent } = infrastructure;
    if (!persistent) {
      throw new Error(
        "The installed sandbox provider does not support persistent filesystems."
      );
    }
    const reservation = await reservePersistentSandbox(
      identity,
      infrastructure.scope
    );
    const sandbox = await accessPersistentSandbox(
      identity,
      infrastructure.scope,
      reservation.name,
      async () => {
        if (!reservation.create) {
          return await persistent.open(reservation.name);
        }
        const created = await persistent.create({
          name: reservation.name,
          signal: AbortSignal.timeout(30_000),
        });
        for (const file of artifact) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- Initialize each file before confirming the persistent allocation is ready.
          await created.writeBinaryFile({
            path: file.path,
            content: Buffer.from(file.content, "base64"),
            abortSignal: AbortSignal.timeout(30_000),
          });
        }
        return created;
      },
      reservation.create
    );
    return {
      handle: handle(identity, sandbox),
      state: { name: reservation.name },
    };
  },
  async resume(context, _artifact, rawState) {
    const { name } = stateSchema.parse(rawState);
    const identity = await identityFor(context);
    const infrastructure = getSandboxProvider();
    const { persistent } = infrastructure;
    if (!persistent) {
      throw new Error("Persistent sandbox provider is unavailable.");
    }
    const sandbox = await accessPersistentSandbox(
      identity,
      infrastructure.scope,
      name,
      async () => await persistent.open(name)
    );
    return handle(identity, sandbox);
  },
  async onSessionEnd(context) {
    const identity = await identityFor(context);
    await remove(identity);
  },
});
const provider = defineSandboxProvider({
  name: "chatjs-persistent",
  environment: appSandboxProvider,
});

/** EVE consumes the installed app provider; lifecycle ownership stays in ChatJS. */
export const createPersistentSandboxEnvironment = (): SandboxEnvironment =>
  provider.environment();

export const registerAppSandboxSession = async (
  context: Pick<SandboxProviderSessionContext, "session">
): Promise<void> => {
  await registerPersistentSession(await identityFor(context));
};
