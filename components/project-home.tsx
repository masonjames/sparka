"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useMemo } from "react";
import { MultimodalInput } from "@/components/multimodal-input";
import type { ChatMessage } from "@/lib/ai/types";
import { useLastMessageId } from "@/lib/stores/hooks-base";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useGetAllChats } from "@/hooks/chat-sync-hooks";

export function ProjectHome({
  chatId,
  projectId,
  status,
}: {
  chatId: string;
  projectId: string;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const trpc = useTRPC();
  const parentMessageId = useLastMessageId();
  const { data: project } = useQuery(trpc.project.getById.queryOptions({ id: projectId }));
  const { data: chats } = useGetAllChats();

  const projectChats = useMemo(
    () => (chats ?? []).filter((c) => c.projectId === projectId),
    [chats, projectId]
  );

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="mx-auto w-full p-2 @[400px]:px-4 @[400px]:pb-4 md:max-w-3xl @[400px]:md:pb-6">
        {project?.name ? (
          <h1 className="mb-3 text-2xl font-bold">{project.name}</h1>
        ) : null}

        <MultimodalInput
          chatId={chatId}
          parentMessageId={parentMessageId}
          status={status}
          disableSuggestedActions
        />

        {projectChats.length > 0 && (
          <div className="mt-4 space-y-2">
            {projectChats.map((chat) => (
              <a
                key={chat.id}
                href={`/group/${chat.projectId}/chat/${chat.id}`}
                className="block rounded-lg border p-3 hover:bg-accent"
              >
                <div className="font-medium">{chat.title}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(chat.updatedAt).toLocaleDateString()}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


