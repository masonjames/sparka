import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { UIChat } from "@/lib/types/uiChat";
import { useGetAllChats, usePinChat, useRenameChat } from "@/hooks/chat-sync-hooks";
import { SidebarChatItem } from "./sidebar-chat-item";
import { Skeleton } from "./ui/skeleton";
import { useSidebar } from "@/components/ui/sidebar";
import { DeleteChatDialog } from "./delete-chat-dialog";

type GroupedChats = {
  pinned: UIChat[];
  today: UIChat[];
  yesterday: UIChat[];
  lastWeek: UIChat[];
  lastMonth: UIChat[];
  older: UIChat[];
};

export function SidebarChatsList() {
  const pathname = usePathname();
  const { data: allChats, isLoading } = useGetAllChats(50);
  const { setOpenMobile } = useSidebar();
  const { mutate: renameChatMutation } = useRenameChat();
  const { mutate: pinChatMutation } = usePinChat();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filter chats: non-project chats only (projectId == null)
  const chats = useMemo(
    () => allChats?.filter((chat) => chat.projectId === null) ?? [],
    [allChats]
  );

  // Extract chatId from URL for /chat routes and /project routes
  const chatId = useMemo(() => {
    if (pathname?.startsWith("/chat/")) {
      return pathname.replace("/chat/", "") || null;
    }
    // Handle project routes: /project/:projectId/chat/:chatId
    const projectMatch = pathname?.match(/^\/project\/[^/]+\/chat\/(.+)$/);
    if (projectMatch) {
      return projectMatch[1] || null;
    }
    return null;
  }, [pathname]);

  const groupedChats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const oneMonthAgo = subMonths(now, 1);

    // Separate pinned and non-pinned chats
    const pinnedChats = chats.filter((chat) => chat.isPinned);
    const nonPinnedChats = chats.filter((chat) => !chat.isPinned);

    const groups = nonPinnedChats.reduce(
      (groups, chat) => {
        const chatDate = new Date(chat.updatedAt);

        if (isToday(chatDate)) {
          groups.today.push(chat);
        } else if (isYesterday(chatDate)) {
          groups.yesterday.push(chat);
        } else if (chatDate > oneWeekAgo) {
          groups.lastWeek.push(chat);
        } else if (chatDate > oneMonthAgo) {
          groups.lastMonth.push(chat);
        } else {
          groups.older.push(chat);
        }

        return groups;
      },
      {
        pinned: [],
        today: [],
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      } as GroupedChats
    );

    // Add pinned chats (sorted by most recently updated first)
    groups.pinned = pinnedChats.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return groups;
  }, [chats]);

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {[44, 32, 28, 64, 52].map((item) => (
          <div
            className="flex h-8 items-center gap-2 rounded-md px-2"
            key={item}
          >
            <Skeleton
              className="h-4 flex-1"
              style={{ width: `${item}%` }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex w-full flex-row items-center justify-center gap-2 px-2 py-4 text-sm text-zinc-500">
        Start chatting to see your conversation history!
      </div>
    );
  }

  return (
    <>
      {groupedChats.pinned.length > 0 && (
        <>
          <div className="px-2 py-1 text-sidebar-foreground/50 text-xs">
            Pinned
          </div>
          {groupedChats.pinned.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={(id) => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              onPin={(id, isPinned) => {
                pinChatMutation({ chatId: id, isPinned });
              }}
              onRename={async (id, title) => {
                renameChatMutation({ chatId: id, title });
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.today.length > 0 && (
        <>
          <div
            className={`px-2 py-1 text-sidebar-foreground/50 text-xs ${groupedChats.pinned.length > 0 ? "mt-6" : ""}`}
          >
            Today
          </div>
          {groupedChats.today.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={(id) => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              onPin={(id, isPinned) => {
                pinChatMutation({ chatId: id, isPinned });
              }}
              onRename={async (id, title) => {
                renameChatMutation({ chatId: id, title });
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.yesterday.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Yesterday
          </div>
          {groupedChats.yesterday.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={(id) => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              onPin={(id, isPinned) => {
                pinChatMutation({ chatId: id, isPinned });
              }}
              onRename={async (id, title) => {
                renameChatMutation({ chatId: id, title });
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.lastWeek.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Last 7 days
          </div>
          {groupedChats.lastWeek.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={(id) => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              onPin={(id, isPinned) => {
                pinChatMutation({ chatId: id, isPinned });
              }}
              onRename={async (id, title) => {
                renameChatMutation({ chatId: id, title });
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.lastMonth.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Last 30 days
          </div>
          {groupedChats.lastMonth.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={(id) => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              onPin={(id, isPinned) => {
                pinChatMutation({ chatId: id, isPinned });
              }}
              onRename={async (id, title) => {
                renameChatMutation({ chatId: id, title });
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}

      {groupedChats.older.length > 0 && (
        <>
          <div className="mt-6 px-2 py-1 text-sidebar-foreground/50 text-xs">
            Older
          </div>
          {groupedChats.older.map((chat) => (
            <SidebarChatItem
              chat={chat}
              isActive={chat.id === chatId}
              key={chat.id}
              onDelete={(id) => {
                setDeleteId(id);
                setShowDeleteDialog(true);
              }}
              onPin={(id, isPinned) => {
                pinChatMutation({ chatId: id, isPinned });
              }}
              onRename={async (id, title) => {
                renameChatMutation({ chatId: id, title });
              }}
              setOpenMobile={setOpenMobile}
            />
          ))}
        </>
      )}
      <DeleteChatDialog
        deleteId={deleteId}
        setShowDeleteDialog={setShowDeleteDialog}
        showDeleteDialog={showDeleteDialog}
      />
    </>
  );
}
