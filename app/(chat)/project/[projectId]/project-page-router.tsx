"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { notFound, usePathname } from "next/navigation";
import { ChatSystem } from "@/components/chat-system";
import { useChatId } from "@/providers/chat-id-provider";
import { useTRPC } from "@/trpc/react";

const PROJECT_ID_REGEX = /^\/project\/([^/]+)/;

export function ProjectPageRouter() {
  const pathname = usePathname();
  const { id } = useChatId();
  const trpc = useTRPC();

  // Extract projectId from pathname
  const projectMatch = pathname?.match(PROJECT_ID_REGEX);
  const projectId = projectMatch?.[1];

  // Load project
  const { data: project } = useSuspenseQuery(
    trpc.project.getById.queryOptions({ id: projectId || "" })
  );

  if (!(projectMatch && project)) {
    return notFound();
  }

  return (
    <ChatSystem
      id={id}
      initialMessages={[]}
      isProjectPage
      isReadonly={false}
      projectId={projectId}
    />
  );
}
