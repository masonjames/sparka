import { ModelsSettings } from "@/components/settings/models-settings";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function ModelsSettingsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.settings.getModelPreferences.queryOptions()
  );

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <div className="shrink-0">
          <h2 className="font-semibold text-lg">Models</h2>
          <p className="text-muted-foreground text-sm">
            Configure your AI model preferences.
          </p>
        </div>
        <ModelsSettings />
      </div>
    </HydrateClient>
  );
}
