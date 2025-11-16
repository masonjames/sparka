import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

export function ReactRenderer(component: ReactElement, dom: HTMLElement) {
  const root = createRoot(dom);
  root.render(component);

  return {
    destroy: () => root.unmount(),
  };
}
