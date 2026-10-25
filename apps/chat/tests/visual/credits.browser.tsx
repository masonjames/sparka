import { takeSnapshot } from "@uiverify/vitest";
import { act, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";

import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import "./sandbox.css";

const Balance = createContext<{
  balanceCents: number | undefined;
  isError: boolean;
}>({ balanceCents: undefined, isError: false });
vi.mock("@/hooks/use-credits", () => ({
  useGetCredits: () => useContext(Balance),
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
  { label: "Starting balance", balanceCents: 50, isError: false },
  { label: "Depleted", balanceCents: 0, isError: false },
  { label: "Overdraft", balanceCents: -17, isError: false },
  { label: "Loading", balanceCents: undefined, isError: false },
  { label: "Failed refresh with stale data", balanceCents: 50, isError: true },
];
test("account balance distinguishes amounts, pending reads and failures", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      await Promise.resolve();
      root.render(
        <div className="grid gap-4 p-6">
          {states.map(({ label, ...balance }) => (
            <section key={label} className="w-64">
              <h2>{label}</h2>
              <Balance value={balance}>
                <SidebarProvider className="min-h-0">
                  <SidebarUserNav />
                </SidebarProvider>
              </Balance>
            </section>
          ))}
        </div>
      );
    });
    for (const text of [
      "0.50",
      "0.00",
      "-0.17",
      "Loading balance…",
      "Balance unavailable",
    ]) {
      // oxlint-disable-next-line no-await-in-loop -- Each distinct state must render before the shared gallery capture.
      await expect.element(page.getByText(text, { exact: true })).toBeVisible();
    }
    await expect
      .poll(
        () => page.getByRole("img", { name: "Fixture user" }).elements().length
      )
      .toBe(states.length);
    await takeSnapshot("credit-balance-states");
  } finally {
    await act(async () => {
      await Promise.resolve();
      root.unmount();
    });
    container.remove();
  }
});
