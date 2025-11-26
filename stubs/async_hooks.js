// Lightweight browser stub for async_hooks to satisfy client bundles.
// No async context tracking; just surface compatibility.
class AsyncLocalStorage {
  disable() {}
  getStore() {
    return undefined;
  }
  run(_store, callback) {
    return callback();
  }
  enterWith(_store) {}
}

class AsyncResource {
  constructor(..._args) {}
}

module.exports = {
  AsyncLocalStorage,
  AsyncResource,
  default: {
    AsyncLocalStorage,
    AsyncResource,
  },
};
