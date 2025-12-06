// Lightweight browser stub for async_hooks to satisfy client bundles.
// Provides no actual async context tracking; only the API surface used by deps.
export class AsyncLocalStorage<T> {
  disable(): void {
    /* no-op in browser stub */
  }
  getStore(): T | undefined {
    return;
  }
  run<R>(_store: T, callback: (...args: unknown[]) => R): R {
    return callback();
  }
  enterWith(_store: T): void {
    /* no-op in browser stub */
  }
}

export class AsyncResource {}

export default {
  AsyncLocalStorage,
  AsyncResource,
};

// CommonJS compatibility (for modules expecting require)
const moduleRef: any =
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
