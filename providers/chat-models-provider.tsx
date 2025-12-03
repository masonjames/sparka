"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getChatModels } from "@/app/actions/getChatModels";
import type { AppModelDefinition } from "@/lib/ai/app-models";

type ChatModelsContextType = {
  models: AppModelDefinition[];
  isLoading: boolean;
  getModelById: (modelId: string) => AppModelDefinition | undefined;
};

const ChatModelsContext = createContext<ChatModelsContextType | undefined>(
  undefined
);

export function ChatModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<AppModelDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getChatModels()
      .then(setModels)
      .finally(() => setIsLoading(false));
  }, []);

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
    <ChatModelsContext.Provider value={{ models, isLoading, getModelById }}>
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
