import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { GroupPageRouter } from "./project-page-router";

export default async function GroupPageRoute({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  // Prefetch project and its chats
  prefetch(trpc.project.getById.queryOptions({ id: groupId }));
  prefetch(trpc.chat.getAllChats.queryOptions({ projectId: groupId }));

  return (
    <HydrateClient>
      <GroupPageRouter />
    </HydrateClient>
  );
}








