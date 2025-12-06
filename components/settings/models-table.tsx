"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { ModelSelectorLogo } from "@/components/model-selector-logo";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { DEFAULT_ENABLED_MODELS } from "@/lib/ai/app-models";
import { AVAILABLE_FEATURES } from "@/lib/features-config";
import { cn } from "@/lib/utils";
import { useChatModels } from "@/providers/chat-models-provider";
import { useTRPC } from "@/trpc/react";

export function ModelsTable({ search }: { search: string }) {
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

    const enabled = new Set(DEFAULT_ENABLED_MODELS);

    for (const pref of preferences) {
      if (pref.enabled) {
        enabled.add(pref.modelId);
      } else {
        enabled.delete(pref.modelId);
      }
    }

    return enabled;
  }, [preferences]);

  const filteredModels = useMemo(() => {
    if (!search.trim()) {
      return allModels;
    }
    const lower = search.toLowerCase();
    return allModels.filter(
      (model) =>
        model.name.toLowerCase().includes(lower) ||
        model.owned_by?.toLowerCase().includes(lower) ||
        model.id.toLowerCase().includes(lower)
    );
  }, [allModels, search]);

  const handleToggle = (modelId: string, currentlyEnabled: boolean) => {
    mutation.mutate({
      modelId,
      enabled: !currentlyEnabled,
    });
  };

  const ReasoningIcon = AVAILABLE_FEATURES.reasoning.icon;

  if (prefsLoading) {
    return (
      <div className="animate-pulse space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="h-11 rounded bg-muted/50" key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableBody>
          {filteredModels.map((model) => {
            const [provider] = model.id.split("/");
            const isEnabled = enabledModelsSet.has(model.id);

            return (
              <TableRow className="" key={model.id}>
                <TableCell className="w-full py-2.5 pl-0">
                  <div className="flex items-center gap-2.5">
                    {provider && <ModelSelectorLogo provider={provider} />}
                    <span className="font-medium text-sm">{model.name}</span>
                    {model.reasoning && (
                      <ReasoningIcon
                        aria-label={AVAILABLE_FEATURES.reasoning.description}
                        className={cn(
                          "size-3.5 text-muted-foreground",
                          isEnabled && "text-foreground"
                        )}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 pr-0">
                  <Switch
                    checked={isEnabled}
                    disabled={mutation.isPending}
                    onCheckedChange={() => handleToggle(model.id, isEnabled)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {filteredModels.length === 0 && (
        <p className="py-8 text-center text-muted-foreground text-sm">
          No models found.
        </p>
      )}
    </>
  );
}
