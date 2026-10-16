import "vitest/browser";

// Commands defined in the packages/registry/visual vitest configs, typed for both the app's and the registry's copy of vitest.
declare module "vitest/browser" {
  interface BrowserCommands {
    appIcon: () => Promise<void>;
    faviconAssets: () => Promise<void>;
    modelAssets: () => Promise<void>;
  }
}
