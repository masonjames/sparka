import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsNav } from "@/components/settings/settings-nav";
import { auth } from "@/lib/auth";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-4xl flex-1 flex-col px-4 py-8">
      <div className="mb-8">
        <h1 className="font-semibold text-2xl">Settings</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage your chat preferences and configurations.
        </p>
      </div>
      {/* Mobile: horizontal tabs on top */}
      <div className="mb-4 md:hidden">
        <SettingsNav orientation="horizontal" />
      </div>
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Desktop: vertical nav on side */}
        <div className="hidden md:block">
          <SettingsNav orientation="vertical" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-4">{children}</div>
      </div>
    </div>
  );
}
