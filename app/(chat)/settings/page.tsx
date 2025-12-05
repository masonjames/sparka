import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { auth } from "@/lib/auth";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const defaultTab = params.tab || "general";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8">
            <h1 className="font-semibold text-2xl">Settings</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Manage your chat preferences and configurations.
            </p>
          </div>
          <SettingsTabs defaultTab={defaultTab} />
        </div>
      </div>
    </div>
  );
}
