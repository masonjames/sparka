"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
} from "@/components/icons";
import { ShareDialog } from "@/components/share-button";
import { ShareMenuItem } from "@/components/upgrade-cta/share-menu-item";
import { ChatRenameDialog } from "@/components/chat-rename-dialog";
import {
  ActionContainer,
  ActionContainerLink,
  ActionContainerTop,
} from "@/components/ui/extra/action-container";
import type { UIChat } from "@/lib/types/uiChat";
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
      <ActionContainer className="flex flex-col gap-1">
        <ActionContainerLink
          // @ts-expect-error - TODO: fix this next route type
          href={chatHref}
        />
        <div className="pr-12">
          <div className="text-sm font-medium">{chat.title}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(chat.updatedAt).toLocaleDateString()}
          </div>
        </div>
        <ActionContainerTop>
          <DropdownMenu modal={true}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
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
        </ActionContainerTop>
      </ActionContainer>
      {shareDialogOpen && (
        <ShareDialog
          chatId={chat.id}
          onOpenChange={setShareDialogOpen}
          open={shareDialogOpen}
        />
      )}

      {renameDialogOpen && (
        <ChatRenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentTitle={chat.title}
          onSubmit={handleRename}
          isLoading={false}
        />
      )}
    </>
  );
}

