"use client";

import { useCallback, useMemo, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  useGetAllChats,
  usePinChat,
  useRenameChat,
} from "@/hooks/chat-sync-hooks";
import { DeleteDialog } from "./delete-dialog";
import { GroupedChatsList } from "./grouped-chats-list";
import { SidebarProjects } from "./sidebar-projects";
import { useSession } from "@/providers/session-provider";

export function SidebarHistory() {
  const { setOpenMobile } = useSidebar();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const { mutate: renameChatMutation } = useRenameChat();
  const { mutate: pinChatMutation } = usePinChat();

  const { data: allChats, isLoading } = useGetAllChats(50);

  // Filter chats: non-project chats only (projectId == null)
  const chats = useMemo(
    () => allChats?.filter((chat) => chat.projectId === null) ?? [],
    [allChats]
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const renameChat = useCallback(
    (chatId: string, title: string) => {
      renameChatMutation({ chatId, title });
    },
    [renameChatMutation]
  );

  const pinChat = useCallback(
    (chatId: string, isPinned: boolean) => {
      pinChatMutation({ chatId, isPinned });
    },
    [pinChatMutation]
  );

  if (!isLoading && (!isAuthenticated || chats.length === 0) && (!isAuthenticated || !allChats || allChats.length === 0)) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
            Start chatting to see your conversation history!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-md px-2"
                key={item}
              >
                <div
                  className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-sidebar-accent-foreground/10"
                  style={
                    {
                      "--skeleton-width": `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      {isAuthenticated && (
        <SidebarGroup>
          <SidebarGroupLabel>Projects</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarProjects />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
      <SidebarGroup>
        <SidebarGroupLabel>Chats</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {chats && chats.length > 0 && (
              <GroupedChatsList
                chats={chats}
                onDelete={(chatId) => {
                  setDeleteId(chatId);
                  setShowDeleteDialog(true);
                }}
                onPin={pinChat}
                onRename={renameChat}
                setOpenMobile={setOpenMobile}
              />
            )}
            {chats && chats.length === 0 && isAuthenticated && (
              <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-4 text-sm text-zinc-500">
                No chats outside of projects
              </div>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      <DeleteDialog
        deleteId={deleteId}
        setShowDeleteDialog={setShowDeleteDialog}
        showDeleteDialog={showDeleteDialog}
      />
    </>
  );
}
