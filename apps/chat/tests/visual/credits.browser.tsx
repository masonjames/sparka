import { takeSnapshot } from "@uiverify/vitest";
import { act, createContext, useContext } from "react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { creditsClient } from "@/plugins/credits/client-plugin";
import "./sandbox.css";

const installation = vi.hoisted(
  (): { summaries: { id: string; Component: ComponentType }[] } => ({
    summaries: [],
  })
);
const Balance = createContext<number | undefined>(undefined);
vi.mock("@/composition/generated/installed-account-ui", () => ({
  installedAccountSummaries: installation.summaries,
}));
vi.mock("@/plugins/credits/use-credits", () => ({
  useGetCredits: () => ({ credits: useContext(Balance) }),
}));
vi.mock("@/lib/auth-client", () => ({ default: {} }));
vi.mock("@/lib/electron-auth", () => ({ isElectronRenderer: () => false }));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/providers/session-provider", () => ({
  useSession: () => ({
    data: {
      user: {
        email: "fixture@example.test",
        name: "Fixture user",
        image:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%23888'/%3E%3C/svg%3E",
      },
    },
    isPending: false,
  }),
}));

const states = [
  { label: "Starting balance", credits: 50 },
  { label: "Depleted", credits: 0 },
  { label: "Overdraft", credits: -17 },
  { label: "Loading or unavailable", credits: undefined },
];
test.each([true, false])(
  "account menu with credits installed: %s",
  async (enabled) => {
    installation.summaries.splice(0);
    if (enabled) {
      installation.summaries.push({
        id: "credits",
        Component: creditsClient().accountSummary,
      });
    }
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => {
        await Promise.resolve();
        root.render(
          <div className="grid gap-4 p-6">
            {(enabled ? states : states.slice(0, 1)).map(
              ({ label, credits }) => (
                <section key={label} className="w-64">
                  <h2>{enabled ? label : "Credits not installed"}</h2>
                  <Balance value={credits}>
                    <SidebarProvider className="min-h-0">
                      <SidebarUserNav />
                    </SidebarProvider>
                  </Balance>
                </section>
              )
            )}
          </div>
        );
      });
      if (enabled) {
        await expect
          .element(page.getByText("0.50", { exact: true }))
          .toBeVisible();
        await expect
          .element(page.getByText("-0.17", { exact: true }))
          .toBeVisible();
        expect(page.getByText("0.00", { exact: true }).elements()).toHaveLength(
          2
        );
      } else {
        await expect.element(page.getByText("Fixture user")).toBeVisible();
        await expect
          .element(page.getByText("0.50", { exact: true }))
          .not.toBeInTheDocument();
      }
      await expect
        .poll(
          () =>
            page.getByRole("img", { name: "Fixture user" }).elements().length
        )
        .toBe(enabled ? states.length : 1);
      await takeSnapshot(
        enabled ? "credits-account-states" : "account-without-credits"
      );
    } finally {
      await act(async () => {
        await Promise.resolve();
        root.unmount();
      });
      container.remove();
    }
  }
);
