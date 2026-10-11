"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, { createContext, useCallback, useContext, useState } from "react";
import type { JSX as ReactJSX } from "react";

import { useSidebar } from "@/components/ui/sidebar";
import { useCurrentChatRoute } from "@/lib/chat-route";
import type { ReadonlyReactNode } from "@/lib/readonly-react-node";
import { useTRPC } from "@/trpc/react";

import { EveDeleteDialog } from "./eve-delete-dialog";

interface Conversation {
  readonly id: string;
  readonly title: string;
  readonly state: string;
  readonly projectId?: string | null;
}

const DeletionContext = createContext<
  ((conversation: Conversation) => void) | null
>(null);

const useEveDeletion = () => {
  const open = useContext(DeletionContext);
  if (!open) {
    throw new Error("Eve deletion requires its layout provider");
  }
  return open;
};

/* oxlint-disable typescript/strict-boolean-expressions -- EveDeletionProvider: max-lines-per-function: keep this cohesive render, state lifecycle, or integration scenario together; extraction needs a separate ownership decision; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including route.id). */

const EveDeletionProvider = ({
  children,
}: {
  readonly children: ReadonlyReactNode;
}): ReactJSX.Element => {
  const [conversation, setConversation] = useState<Conversation>();
  const route = useCurrentChatRoute();
  const router = useRouter();
  const cache = useQueryClient();
  const trpc = useTRPC();
  const { setOpenMobile } = useSidebar();
  const openConversation = useCallback(
    (value: Conversation) => {
      setConversation(value);
      setOpenMobile(false);
    },
    [setOpenMobile]
  );
  const changed = async (rootId: string): Promise<void> => {
    /* oxlint-disable react/todo -- Preserve cache invalidation in finally after route changes. */
    try {
      if (route.id && (route.type === "chat" || route.type === "projectChat")) {
        const response = await fetch(`/api/agent-conversations/${route.id}`, {
          signal: AbortSignal.timeout(10_000),
        });
        const status: unknown = await response.json();
        if (
          response.ok &&
          typeof status === "object" &&
          status !== null &&
          "rootId" in status &&
          status.rootId === rootId
        ) {
          const projectId =
            conversation?.projectId ??
            (route.source === "project" ? route.projectId : undefined);
          router.replace(
            typeof projectId === "string" && projectId !== ""
              ? `/project/${projectId}`
              : "/"
          );
        }
      }
    } finally {
      await cache.invalidateQueries({ queryKey: trpc.eve.list.pathKey() });
      router.refresh();
    }
    /* oxlint-enable react/todo */
  };
  return (
    <DeletionContext.Provider value={openConversation}>
      {children}
      {conversation && (
        <EveDeleteDialog
          conversation={conversation}
          key={conversation.id}
          onChanged={changed}
          onClose={() => {
            setConversation(undefined);
          }}
        />
      )}
    </DeletionContext.Provider>
  );
};
/* oxlint-enable typescript/strict-boolean-expressions */
export { EveDeletionProvider, useEveDeletion };
