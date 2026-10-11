"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { frontendToolsSchema } from "@/lib/ai/types";
import type { UiToolName } from "@/lib/ai/types";
import { draftAttachment } from "@/lib/eve/draft";
import type { DraftAttachment } from "@/lib/eve/draft";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";

const composerDraft = z.object({
  attachments: z.array(draftAttachment),
  selectedTool: frontendToolsSchema.nullable().default(null),
  text: z.string(),
});
type Draft = ReadonlyNativeSurface<z.infer<typeof composerDraft>>;

const emptyDraft: Draft = { attachments: [], selectedTool: null, text: "" };
type ComposerDraftState = Draft & {
  error: string | undefined;
  loaded: boolean;
  setAttachments: Dispatch<
    SetStateAction<readonly Readonly<DraftAttachment>[]>
  >;
  setSelectedTool: Dispatch<SetStateAction<UiToolName | null>>;
  setText: Dispatch<SetStateAction<string>>;
};

/**
 * Persist unsent input synchronously, before response navigation can unmount it.
 * @param {string} ownerId The owner whose drafts remain isolated in this tab.
 * @param {string} scopeId The conversation or response scope that owns this input.
 * @returns {ComposerDraftState} Draft fields, restore and save status, and React-compatible setters.
 */
export const useEveComposerDraft = (
  ownerId: string,
  scopeId: string
): ComposerDraftState => {
  const key = `chatjs.eve.composer:${ownerId}:${scopeId}`;
  const current = useRef<Draft>(emptyDraft);
  const [value, setValue] = useState(emptyDraft);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      const restored =
        typeof saved === "string" && saved !== ""
          ? composerDraft.parse(JSON.parse(saved))
          : { attachments: [], selectedTool: null, text: "" };
      current.current = restored;
      // oxlint-disable-next-line react/set-state-in-effect -- Hydrate controlled editor state from session storage on mount.
      setValue(restored);
      setError(undefined);
    } catch {
      setError(
        "The saved draft could not be restored. Keep this tab open for recovery."
      );
    }
    setLoaded(true);
  }, [key]);
  const update = useCallback(
    (change: (draft: Draft) => Draft): void => {
      const next = change(current.current);
      current.current = next;
      setValue(next);
      try {
        if (next.text || next.attachments.length > 0 || next.selectedTool) {
          sessionStorage.setItem(key, JSON.stringify(next));
        } else {
          sessionStorage.removeItem(key);
        }
        setError(undefined);
      } catch {
        setError(
          "Your draft could not be saved. Keep this tab open before switching responses."
        );
      }
    },
    [key]
  );
  const setText = useCallback(
    (text: SetStateAction<string>): void => {
      update((draft) => ({
        ...draft,
        text: typeof text === "function" ? text(draft.text) : text,
      }));
    },
    [update]
  );
  const setAttachments = useCallback(
    (
      attachments: SetStateAction<readonly Readonly<DraftAttachment>[]>
    ): void => {
      update((draft) => ({
        ...draft,
        attachments:
          typeof attachments === "function"
            ? attachments(draft.attachments)
            : attachments,
      }));
    },
    [update]
  );
  const setSelectedTool = useCallback(
    (tool: SetStateAction<UiToolName | null>): void => {
      update((draft) => ({
        ...draft,
        selectedTool:
          typeof tool === "function" ? tool(draft.selectedTool) : tool,
      }));
    },
    [update]
  );
  return { ...value, error, loaded, setAttachments, setSelectedTool, setText };
};
