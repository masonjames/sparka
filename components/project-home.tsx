"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PencilEditIcon } from "@/components/icons";
import { MultimodalInput } from "@/components/multimodal-input";
import { ProjectChatItem } from "@/components/project-chat-item";
import { ProjectDetailsDialog } from "@/components/project-details-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteChat,
  useGetAllChats,
  useRenameChat,
  useRenameProject,
} from "@/hooks/chat-sync-hooks";
import type { ChatMessage } from "@/lib/ai/types";
import { useLastMessageId } from "@/lib/stores/hooks-base";
import type { UIChat } from "@/lib/types/ui-chat";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/react";

function ProjectConfig({
  projectName,
  instructions,
  onEditInstructions,
  onRenameProject,
}: {
  projectName?: string;
  instructions?: string | null;
  onEditInstructions: () => void;
  onRenameProject: () => void;
}) {
  return (
    <div className="space-y-4">
      {projectName && (
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-2xl">{projectName}</h1>
          <Button
            className="h-8 w-8"
            onClick={onRenameProject}
            size="icon"
            type="button"
            variant="ghost"
          >
            <PencilEditIcon size={16} />
            <span className="sr-only">Rename project</span>
          </Button>
        </div>
      )}

      <Card className="bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Instructions</CardTitle>
              {!instructions?.trim() && (
                <CardDescription>
                  Add instructions to tailor AI responses for this project.
                </CardDescription>
              )}
            </div>
            {instructions?.trim() ? (
              <Button
                className="h-8 w-8"
                onClick={onEditInstructions}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PencilEditIcon size={16} />
                <span className="sr-only">Edit instructions</span>
              </Button>
            ) : (
              <Button
                onClick={onEditInstructions}
                type="button"
                variant="outline"
              >
                Set instructions
              </Button>
            )}
          </div>
        </CardHeader>
        {instructions?.trim() && (
          <CardContent>
            <div className="line-clamp-3 whitespace-pre-wrap text-muted-foreground text-sm">
              {instructions}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function ProjectInput({
  chatId,
  parentMessageId,
  status,
}: {
  chatId: string;
  parentMessageId: string | null;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  return (
    <MultimodalInput
      chatId={chatId}
      parentMessageId={parentMessageId}
      status={status}
    />
  );
}

function ProjectChats({
  chats,
  onDelete,
  onRename,
}: {
  chats: UIChat[] | undefined;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => Promise<void>;
}) {
  if (!chats) {
    return null;
  }

  if (chats.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 px-4 py-6">
        <p className="font-medium text-foreground text-sm">
          No chats in this project
        </p>
        <p className="mt-1 text-muted-foreground text-sm">
          Start a chat to keep conversations organized and re-use project
          knowledge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {chats.map((chat) => (
        <ProjectChatItem
          chat={chat}
          key={chat.id}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}

export function ProjectHome({
  chatId,
  projectId,
  status,
}: {
  chatId: string;
  projectId: string;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const parentMessageId = useLastMessageId();
  const { data: project } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );
  const { data: chats } = useGetAllChats({
    projectId,
  });
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [instructionsValue, setInstructionsValue] = useState("");
  const [renameProjectDialogOpen, setRenameProjectDialogOpen] = useState(false);
  const shouldCenter = chats !== undefined && chats.length === 0;

  const { deleteChat } = useDeleteChat();
  const renameChatMutation = useRenameChat();
  const renameProjectMutation = useRenameProject();

  const setInstructionsMutation = useMutation(
    trpc.project.setInstructions.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.project.getById.queryKey({ id: projectId }),
        });
        setInstructionsDialogOpen(false);
      },
    })
  );

  const handleOpenInstructionsDialog = () => {
    setInstructionsValue(project?.instructions ?? "");
    setInstructionsDialogOpen(true);
  };

  const handleCloseInstructionsDialog = () => {
    setInstructionsDialogOpen(false);
    setInstructionsValue(project?.instructions ?? "");
  };

  const handleSaveInstructions = () => {
    setInstructionsMutation.mutate({
      id: projectId,
      instructions: instructionsValue,
    });
  };

  const handleRenameProject = async (name: string) => {
    await renameProjectMutation.mutateAsync({
      id: projectId,
      updates: { name },
    });
    queryClient.invalidateQueries({
      queryKey: trpc.project.getById.queryKey({ id: projectId }),
    });
  };

  const handleRenameChat = async (idToRename: string, title: string) => {
    await renameChatMutation.mutateAsync({
      chatId: idToRename,
      title,
    });
    toast.success("Chat renamed successfully");
  };

  return (
    <div className="flex flex-1 justify-center overflow-y-auto">
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full flex-col p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6",
          shouldCenter && "grid grid-rows-[1fr_auto_1fr]"
        )}
      >
        <div className={cn("space-y-4", shouldCenter ? "row-start-2" : "mt-4")}>
          <ProjectConfig
            instructions={project?.instructions}
            onEditInstructions={handleOpenInstructionsDialog}
            onRenameProject={() => setRenameProjectDialogOpen(true)}
            projectName={project?.name}
          />

          <ProjectInput
            chatId={chatId}
            parentMessageId={parentMessageId}
            status={status}
          />
        </div>

        {chats !== undefined && (
          <div
            className={cn(
              shouldCenter
                ? "row-start-3 mt-6"
                : "mt-4 min-h-0 flex-1"
            )}
          >
            <ProjectChats
              chats={chats}
              onDelete={deleteChat}
              onRename={handleRenameChat}
            />
          </div>
        )}

        <Dialog
          onOpenChange={handleCloseInstructionsDialog}
          open={instructionsDialogOpen}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Set project instructions</DialogTitle>
              <DialogDescription>
                Provide relevant instructions and information for chats within{" "}
                {project?.name ?? "this project"}. This will work alongside user
                preferences and the selected style in a chat.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                autoFocus
                className="min-h-[200px] resize-none"
                onChange={(e) => setInstructionsValue(e.target.value)}
                placeholder="Enter project instructions..."
                value={instructionsValue}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleCloseInstructionsDialog}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={setInstructionsMutation.isPending}
                onClick={handleSaveInstructions}
                type="button"
              >
                {setInstructionsMutation.isPending
                  ? "Saving..."
                  : "Save instructions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProjectDetailsDialog
          initialValue={project?.name}
          isLoading={renameProjectMutation.isPending}
          mode="edit"
          onOpenChange={setRenameProjectDialogOpen}
          onSubmit={handleRenameProject}
          open={renameProjectDialogOpen}
        />
      </div>
    </div>
  );
}
