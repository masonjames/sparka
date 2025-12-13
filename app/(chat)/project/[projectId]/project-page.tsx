"use client";

import { useQuery } from "@tanstack/react-query";
import { notFound, useParams } from "next/navigation";
import { ChatSystem } from "@/components/chat-system";
import { useChatId } from "@/providers/chat-id-provider";
import { useTRPC } from "@/trpc/react";

export function ProjectPage() {
  const params = useParams<{ projectId?: string }>();
  const { id } = useChatId();
  const trpc = useTRPC();

  const projectId = params.projectId;

  // Load project
  const {
    data: project,
    isLoading,
    isError,
  } = useQuery({
    ...trpc.project.getById.queryOptions({ id: projectId ?? "" }),
    enabled: !!projectId,
  });

  if (!projectId || isLoading) {
    return null;
  }

  if (isError || !project) {
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
