"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import {
  type AppModelDefinition,
  DEFAULT_ENABLED_MODELS,
} from "@/lib/ai/app-models";

type ChatModelsContextType = {
  models: AppModelDefinition[];
  allModels: AppModelDefinition[];
  getModelById: (modelId: string) => AppModelDefinition | undefined;
};

const ChatModelsContext = createContext<ChatModelsContextType | undefined>(
  undefined
);

export function ChatModelsProvider({
  children,
  models,
  enabledModelIds,
}: {
  children: ReactNode;
  models: AppModelDefinition[];
  enabledModelIds?: string[];
}) {
  const allModelsMap = useMemo(() => {
    const map = new Map<string, AppModelDefinition>();
    for (const model of models) {
      map.set(model.id, model);
    }
    return map;
  }, [models]);

  const enabledModelsSet = useMemo(() => {
    // If no preferences provided, use defaults
    if (!enabledModelIds) {
      return new Set(DEFAULT_ENABLED_MODELS);
    }
    return new Set(enabledModelIds);
  }, [enabledModelIds]);

  const filteredModels = useMemo(
    () => models.filter((model) => enabledModelsSet.has(model.id)),
    [models, enabledModelsSet]
  );

  const getModelById = useCallback(
    (modelId: string) => allModelsMap.get(modelId),
    [allModelsMap]
  );

  return (
    <ChatModelsContext.Provider
      value={{ models: filteredModels, allModels: models, getModelById }}
    >
      {children}
    </ChatModelsContext.Provider>
  );
}

export function useChatModels() {
  const context = useContext(ChatModelsContext);
  if (context === undefined) {
    throw new Error("useChatModels must be used within a ChatModelsProvider");
  }
  return context;
}
