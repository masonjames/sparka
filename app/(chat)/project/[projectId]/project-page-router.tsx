"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { usePathname } from "next/navigation";
import { ChatSystem } from "@/components/chat-system";
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

  return (
    <ChatSystem
      id={id}
      initialMessages={[]}
      isReadonly={false}
      projectId={groupId}
      isProjectPage
    />
  );
}

