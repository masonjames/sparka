import React, { createElement } from "react";
import { create } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import { DeviceLoginPage } from "./device-login-page";

const mocks = vi.hoisted(() => ({
  transferUser:
    vi.fn<
      (
        args: Readonly<{ fetchOptions?: Readonly<{ onError?: () => void }> }>
      ) => Promise<{ done: true }>
    >(),
}));

vi.mock("@/lib/auth-client", () => ({
  default: {
    electron: { transferUser: mocks.transferUser },
    getSession: vi.fn(),
  },
}));
vi.mock("next/link", () => ({
  default: (props: Readonly<ComponentProps<"a">>): React.ReactElement =>
    createElement("a", props),
}));

const searchParams = new URLSearchParams("done=1");

vi.mock("next/navigation", () => ({
  usePathname: (): string => "/device-login",
  useSearchParams: (): URLSearchParams => searchParams,
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  mocks.transferUser.mockReset();
});
/* oxlint-disable typescript/promise-function-async -- device-login-page.test route: init-declarations: branches initialize this value before use; an eager undefined initializer adds a second missing-value state; typescript/promise-function-async: return the existing promise directly; adding async changes synchronous throw behavior and promise identity. */

describe("device login page", () => {
  it("shows retry transfer progress and returns to waiting after onError", () => {
    const transfer = Promise.withResolvers<{ done: true }>();
    let fetchOptions:
      | {
          onError?: () => void;
        }
      | undefined;
    mocks.transferUser.mockImplementation(({ fetchOptions: options }) => {
      fetchOptions = options;
      return transfer.promise;
    });

    // oxlint-disable-next-line typescript/no-deprecated -- `create` is deprecated with react-test-renderer; keep its existing renderer fixture until the test migrates to a different renderer.
    let renderer: ReturnType<typeof create> | undefined;
    React.act(() => {
      // oxlint-disable-next-line typescript/no-deprecated -- `create` is deprecated with react-test-renderer; keep its existing renderer fixture until the test migrates to a different renderer.
      renderer = create(<DeviceLoginPage />);
    });

    expect(renderer?.root.findByType("a").props.href).toBe("/");

    const retryButton = renderer?.root.find(
      (node: {
        readonly props: Readonly<Record<string, unknown>>;
        readonly type: unknown;
        readonly children: readonly unknown[];
      }) => node.type === "button" && node.children.includes("Try again")
    );
    expect(retryButton).toBeDefined();

    React.act(() => {
      // oxlint-disable-next-line typescript/no-unsafe-call -- typescript/no-unsafe-call: `ReactTestInstance.props` is declared as `any` by the pinned renderer types, so this is the fixture's native renderer ABI boundary. Optional chain: Keep the existing nullish guard when reading props from retryButton; preserve one receiver evaluation, skipped accesses and the undefined short-circuit result. The app guidance prefers optional chaining.
      retryButton?.props.onClick();
    });
    expect(
      renderer?.root.findAll(
        (node: {
          readonly props: Readonly<Record<string, unknown>>;
          readonly type: unknown;
          readonly children: readonly unknown[];
        }) => node.children.includes("Opening the desktop app...")
      )
    ).toHaveLength(1);

    React.act(() => {
      fetchOptions?.onError?.();
    });
    expect(
      renderer?.root.findAll(
        (node: {
          readonly props: Readonly<Record<string, unknown>>;
          readonly type: unknown;
          readonly children: readonly unknown[];
        }) => node.children.includes("You're signed in")
      )
    ).toHaveLength(1);
    expect(
      renderer?.root.findAll(
        (node: {
          readonly props: Readonly<Record<string, unknown>>;
          readonly type: unknown;
          readonly children: readonly unknown[];
        }) => node.children.includes("Opening the desktop app...")
      )
    ).toHaveLength(0);
  });
});
/* oxlint-enable typescript/promise-function-async */
