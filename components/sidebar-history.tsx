"use client";

import { useCallback, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  usePinChat,
  useRenameChat,
} from "@/hooks/chat-sync-hooks";
import { DeleteDialog } from "./delete-dialog";
import { SidebarChatsList } from "./sidebar-chats-list";
import { SidebarProjects } from "./sidebar-projects";
import { useSession } from "@/providers/session-provider";

export function SidebarHistory() {
  const { setOpenMobile } = useSidebar();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const { mutate: renameChatMutation } = useRenameChat();
  const { mutate: pinChatMutation } = usePinChat();

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
            <SidebarChatsList
              onDelete={(chatId) => {
                setDeleteId(chatId);
                setShowDeleteDialog(true);
              }}
              onPin={pinChat}
              onRename={renameChat}
              setOpenMobile={setOpenMobile}
            />
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
