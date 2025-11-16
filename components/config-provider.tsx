"use client";

import { createContext, useContext } from "react";
import type { SiteConfig } from "@/lib/config";

const ConfigContext = createContext<SiteConfig | null>(null);

export function ConfigProvider({
  value,
  children,
}: {
  value: SiteConfig;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): SiteConfig {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return ctx;
}
