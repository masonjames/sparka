import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { GroupChatPageRouter } from "./project-chat-page-router";

export default async function GroupChatPageRoute({
  params,
}: {
  params: Promise<{ groupId: string; chatId: string }>;
}) {
  const { groupId, chatId } = await params;

  // Prefetch the queries used in group-chat-page.tsx
  prefetch(trpc.project.getById.queryOptions({ id: groupId }));
  prefetch(trpc.chat.getChatById.queryOptions({ chatId }));
  prefetch(trpc.chat.getChatMessages.queryOptions({ chatId }));

  return (
    <HydrateClient>
      <GroupChatPageRouter />
    </HydrateClient>
  );
}








