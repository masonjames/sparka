// Lightweight browser stub for async_hooks to satisfy client bundles.
// No async context tracking; just surface compatibility.
class AsyncLocalStorage {
  disable() {
    /* no-op in browser stub */
  }
  getStore() {
    return;
  }
  run(_store, callback) {
    return callback();
  }
  enterWith(_store) {
    /* no-op in browser stub */
  }
}

class AsyncResource {}

module.exports = {
  AsyncLocalStorage,
  AsyncResource,
  default: {
    AsyncLocalStorage,
    AsyncResource,
  },
};
