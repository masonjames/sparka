// Lightweight browser stub for async_hooks to satisfy client bundles.
// Provides no actual async context tracking; only the API surface used by deps.
export class AsyncLocalStorage<T> {
  disable(): void {}
  getStore(): T | undefined {
    return undefined;
  }
  run<R>(store: T, callback: (...args: unknown[]) => R): R {
    return callback();
  }
  enterWith(_store: T): void {}
}

export class AsyncResource {
  constructor(..._args: unknown[]) {}
}

export default {
  AsyncLocalStorage,
  AsyncResource,
};

// CommonJS compatibility (for modules expecting require)
// biome-ignore lint/style/noVar: CJS compatibility shim
// eslint-disable-next-line no-var
var moduleRef: any =
  typeof module !== "undefined" && typeof module.exports !== "undefined"
    ? module
    : undefined;
if (moduleRef?.exports) {
  moduleRef.exports = {
    AsyncLocalStorage,
    AsyncResource,
    default: {
      AsyncLocalStorage,
      AsyncResource,
    },
  };
}
