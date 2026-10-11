import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

const mount = async (
  children: ReactNode
): Promise<{
  readonly container: HTMLElement;
  readonly root: ReturnType<typeof createRoot>;
}> => {
  const container = document.createElement("main");
  document.body.append(container);
  const root = createRoot(container);
  // oxlint-disable-next-line eslint/require-await -- React act exposes its runtime completion promise through an async callback, even when this render or unmount is synchronous.
  await act(async () => {
    root.render(children);
  });
  return { container, root };
};
const unmount = async (
  fixture: Awaited<ReturnType<typeof mount>>
): Promise<void> => {
  // oxlint-disable-next-line eslint/require-await -- React act exposes its runtime completion promise through an async callback, even when this render or unmount is synchronous.
  await act(async () => {
    fixture.root.unmount();
  });
  fixture.container.remove();
};

export { mount, unmount };
