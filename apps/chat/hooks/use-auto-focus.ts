"use client";

import type { LexicalEditor } from "lexical";
import { useEffect } from "react";

export function useAutoFocus({
  autoFocus,
  editor,
}: {
  autoFocus: boolean;
  editor: LexicalEditor | null;
}) {
  useEffect(() => {
    if (!(autoFocus && editor)) {
      return;
    }

    let fallbackTimeout: number | null = null;

    const raf = window.requestAnimationFrame(() => {
      const active = document.activeElement;
      const isUserTypingElsewhere =
        (active instanceof HTMLInputElement &&
          !active.readOnly &&
          !active.disabled &&
          active.type !== "hidden") ||
        (active instanceof HTMLTextAreaElement &&
          !active.readOnly &&
          !active.disabled) ||
        (active instanceof HTMLElement && active.isContentEditable);

      if (!isUserTypingElsewhere) {
        editor.focus();
        // Minimal fallback for hydration/layout races where focus is stolen.
        fallbackTimeout = window.setTimeout(() => {
          const currentActive = document.activeElement;
          const stillNotTyping =
            (currentActive instanceof HTMLInputElement &&
              !currentActive.readOnly &&
              !currentActive.disabled &&
              currentActive.type !== "hidden") ||
            (currentActive instanceof HTMLTextAreaElement &&
              !currentActive.readOnly &&
              !currentActive.disabled) ||
            (currentActive instanceof HTMLElement &&
              currentActive.isContentEditable);

          if (!stillNotTyping) {
            editor.focus();
          }
        }, 120);
      }
    });

    return () => {
      window.cancelAnimationFrame(raf);
      if (fallbackTimeout !== null) {
        window.clearTimeout(fallbackTimeout);
      }
    };
  }, [autoFocus, editor]);
}
