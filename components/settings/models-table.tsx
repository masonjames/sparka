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

export function ModelsTable({
  search,
  className,
}: {
  search: string;
  className?: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { allModels } = useChatModels();

  const { data: preferences, isLoading: prefsLoading } = useQuery(
    trpc.settings.getModelPreferences.queryOptions()
  );

  const mutation = useMutation(
    trpc.settings.setModelEnabled.mutationOptions({
      onMutate: async (newData) => {
        await queryClient.cancelQueries({
          queryKey: trpc.settings.getModelPreferences.queryKey(),
        });

        const previousPrefs = queryClient.getQueryData(
          trpc.settings.getModelPreferences.queryKey()
        );

        queryClient.setQueryData(
          trpc.settings.getModelPreferences.queryKey(),
          (old: typeof previousPrefs) => {
            if (!old) {
              return;
            }
            const exists = old.some((p) => p.modelId === newData.modelId);
            if (exists) {
              return old.map((p) =>
                p.modelId === newData.modelId
                  ? { ...p, enabled: newData.enabled }
                  : p
              );
            }
            // New preference - just return old, server will create it
            return old;
          }
        );

        return { previousPrefs };
      },
      onError: (_err, _newData, context) => {
        if (context?.previousPrefs) {
          queryClient.setQueryData(
            trpc.settings.getModelPreferences.queryKey(),
            context.previousPrefs
          );
        }
        toast.error("Failed to update model preference");
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.settings.getModelPreferences.queryKey(),
        });
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
      <Table className={className}>
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
