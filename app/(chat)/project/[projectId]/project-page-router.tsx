"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { usePathname } from "next/navigation";
import { ChatSystem } from "@/components/chat-system";
import { useTRPC } from "@/trpc/react";
import { useChatId } from "@/providers/chat-id-provider";

export function ProjectPageRouter() {
  const pathname = usePathname();
  const { id } = useChatId();
  const trpc = useTRPC();

  // Extract projectId from pathname
  const projectMatch = pathname?.match(/^\/project\/([^/]+)/);
  if (!projectMatch) {
    return notFound();
  }
  const projectId = projectMatch[1];

  // Load project
  const { data: project } = useSuspenseQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  if (!project) {
    return notFound();
  }

  return (
    <ChatSystem
      id={id}
      initialMessages={[]}
      isReadonly={false}
      projectId={projectId}
      isProjectPage
    />
  );
}

