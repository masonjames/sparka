"use client";

import Link from "next/link";
import { useState } from "react";
import { ChatRenameDialog } from "@/components/chat-rename-dialog";
import {
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
} from "@/components/icons";
import { ShareDialog } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShareMenuItem } from "@/components/upgrade-cta/share-menu-item";
import type { UIChat } from "@/lib/types/ui-chat";
export function ProjectChatItem({
  chat,
  onDelete,
  onRename,
}: {
  chat: UIChat;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => Promise<void>;
}) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const chatHref: `/project/${string}/chat/${string}` = `/project/${chat.projectId}/chat/${chat.id}`;

  const handleRename = async (title: string) => {
    await onRename(chat.id, title);
  };

  return (
    <>
      <div className="group relative flex items-center gap-3 px-4 py-3">
        <Link
          // @ts-expect-error - TODO: fix this next route type
          className="absolute inset-0 z-10"
          href={chatHref}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">{chat.title}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3 pr-10">
          <div className="text-muted-foreground text-xs">
            {new Date(chat.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <div className="z-20">
          <DropdownMenu modal={true}>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                size="icon"
                type="button"
                variant="ghost"
              >
                <MoreHorizontalIcon />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setRenameDialogOpen(true)}
              >
                <PencilEditIcon />
                <span>Rename</span>
              </DropdownMenuItem>

              <ShareMenuItem onShare={() => setShareDialogOpen(true)} />

              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
                onSelect={() => onDelete(chat.id)}
              >
                <TrashIcon />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {shareDialogOpen && (
        <ShareDialog
          chatId={chat.id}
          onOpenChange={setShareDialogOpen}
          open={shareDialogOpen}
        />
      )}

      {renameDialogOpen && (
        <ChatRenameDialog
          currentTitle={chat.title}
          isLoading={false}
          onOpenChange={setRenameDialogOpen}
          onSubmit={handleRename}
          open={renameDialogOpen}
        />
      )}
    </>
  );
}
