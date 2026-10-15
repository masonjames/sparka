import "vitest/browser";

// Commands defined in packages/registry/visual/vitest.config.ts, typed for both the app's and the registry's copy of vitest.
declare module "vitest/browser" {
  interface BrowserCommands {
    appIcon: () => Promise<void>;
    faviconAssets: () => Promise<void>;
  }
}
