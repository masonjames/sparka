"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from "react";
import type { AppModelDefinition } from "@/lib/ai/app-models";

type ChatModelsContextType = {
  models: AppModelDefinition[];
  getModelById: (modelId: string) => AppModelDefinition | undefined;
};

const ChatModelsContext = createContext<ChatModelsContextType | undefined>(
  undefined
);

export function ChatModelsProvider({
  children,
  models,
}: {
  children: ReactNode;
  models: AppModelDefinition[];
}) {
  const modelsMap = useMemo(() => {
    const map = new Map<string, AppModelDefinition>();
    for (const model of models) {
      map.set(model.id, model);
    }
    return map;
  }, [models]);

  const getModelById = useCallback(
    (modelId: string) => modelsMap.get(modelId),
    [modelsMap]
  );

  return (
    <ChatModelsContext.Provider value={{ models, getModelById }}>
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
