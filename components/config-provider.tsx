"use client";

import { createContext, useContext } from "react";
import type { Config } from "@/lib/config/index";

const ConfigContext = createContext<Config | null>(null);

export function ConfigProvider({
  value,
  children,
}: {
  value: Config;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): Config {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return ctx;
}
