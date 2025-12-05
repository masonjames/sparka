"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { ModelSelectorLogo } from "@/components/model-selector-logo";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_ENABLED_MODELS } from "@/lib/ai/app-models";
import { useChatModels } from "@/providers/chat-models-provider";
import { useTRPC } from "@/trpc/react";

export function ModelsSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { allModels } = useChatModels();

  const { data: preferences, isLoading: prefsLoading } = useQuery(
    trpc.settings.getModelPreferences.queryOptions()
  );

  const mutation = useMutation(
    trpc.settings.setModelEnabled.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.settings.getModelPreferences.queryKey(),
        });
      },
      onError: () => {
        toast.error("Failed to update model preference");
      },
    })
  );

  const enabledModelsSet = useMemo(() => {
    if (!preferences) {
      return new Set(DEFAULT_ENABLED_MODELS);
    }

    // Start with defaults
    const enabled = new Set(DEFAULT_ENABLED_MODELS);

    // Apply user preferences
    for (const pref of preferences) {
      if (pref.enabled) {
        enabled.add(pref.modelId);
      } else {
        enabled.delete(pref.modelId);
      }
    }

    return enabled;
  }, [preferences]);

  const handleToggle = (modelId: string, currentlyEnabled: boolean) => {
    mutation.mutate({
      modelId,
      enabled: !currentlyEnabled,
    });
  };

  if (prefsLoading) {
    return (
      <div className="rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div className="h-14 rounded bg-muted" key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4">
        <h2 className="font-medium text-lg">Models</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Choose which models appear in your model selector.
        </p>
      </div>

      <div className="space-y-2">
        {allModels.map((model) => {
          const [provider] = model.id.split("/");
          const isEnabled = enabledModelsSet.has(model.id);

          return (
            <div
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              key={model.id}
            >
              <div className="flex items-center gap-3">
                {provider && <ModelSelectorLogo provider={provider} />}
                <div>
                  <div className="font-medium text-sm">{model.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {model.owned_by}
                    {model.reasoning && " • Reasoning"}
                  </div>
                </div>
              </div>
              <Switch
                checked={isEnabled}
                disabled={mutation.isPending}
                onCheckedChange={() => handleToggle(model.id, isEnabled)}
              />
            </div>
          );
        })}
      </div>

      {allModels.length === 0 && (
        <p className="text-center text-muted-foreground text-sm">
          No models available.
        </p>
      )}
    </div>
  );
}
