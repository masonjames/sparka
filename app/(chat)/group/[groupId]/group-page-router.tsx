"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ChatSystem } from "@/components/chat-system";
import { useGetAllChats } from "@/hooks/chat-sync-hooks";
import { useTRPC } from "@/trpc/react";
import { useChatId } from "@/providers/chat-id-provider";

export function GroupPageRouter() {
  const pathname = usePathname();
  const { id } = useChatId();
  const trpc = useTRPC();

  // Extract groupId from pathname
  const groupMatch = pathname?.match(/^\/group\/([^/]+)/);
  if (!groupMatch) {
    return notFound();
  }
  const groupId = groupMatch[1];

  // Load project
  const { data: project } = useSuspenseQuery(
    trpc.project.getById.queryOptions({ id: groupId })
  );

  if (!project) {
    return notFound();
  }

  // Load chats for this project
  const { data: chats } = useGetAllChats();
  const projectChats = useMemo(
    () => chats?.filter((chat) => chat.projectId === groupId) ?? [],
    [chats, groupId]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {projectChats.length > 0 && (
            <div className="mt-4 space-y-2">
              {projectChats.map((chat) => (
                <a
                  key={chat.id}
                  href={`/group/${groupId}/chat/${chat.id}`}
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
      <div className="border-t">
        <ChatSystem id={id} initialMessages={[]} isReadonly={false} projectId={groupId} />
      </div>
    </div>
  );
}

