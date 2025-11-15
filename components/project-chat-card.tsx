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
  ActionCard,
  ActionCardLink,
  ActionCardTop,
} from "@/components/ui/extra/action-card";
import type { UIChat } from "@/lib/types/uiChat";
import { CardContent } from "@/components/ui/card";
export function ProjectChatCard({
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
  const chatHref: `/group/${string}/chat/${string}` = `/group/${chat.projectId}/chat/${chat.id}`;

  const handleRename = async (title: string) => {
    await onRename(chat.id, title);
  };

  return (
    <ActionCard className="group p-3">
      <ActionCardLink
        // @ts-expect-error - TODO: fix this next route type
        href={chatHref}
        onClick={(e) => {
          if (e.button === 1 || e.ctrlKey || e.metaKey) {
            return;
          }
          e.preventDefault();
          window.history.pushState(null, "", chatHref);
        }}
      />

      <div className="pr-8">
        <div className="font-medium">{chat.title}</div>
        <div className="text-sm text-muted-foreground">
          {new Date(chat.updatedAt).toLocaleDateString()}
        </div>
      </div>

      <ActionCardTop>
        <DropdownMenu modal={true}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0 group-hover:opacity-100"
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
      </ActionCardTop>

      {shareDialogOpen && (
        <ShareDialog
          chatId={chat.id}
          onOpenChange={setShareDialogOpen}
          open={shareDialogOpen}
        />
      )}

      <ChatRenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        currentTitle={chat.title}
        onSubmit={handleRename}
        isLoading={false}
      />
    </ActionCard>
  );
}

