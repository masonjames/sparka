"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MultimodalInput } from "@/components/multimodal-input";
import type { ChatMessage } from "@/lib/ai/types";
import { useLastMessageId } from "@/lib/stores/hooks-base";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeleteChat, useGetAllChats, useRenameChat } from "@/hooks/chat-sync-hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectChatCard } from "@/components/project-chat-card";
import { PencilEditIcon } from "@/components/icons";
import { ProjectDetailsDialog } from "@/components/project-details-dialog";
import { useRenameProject } from "@/hooks/chat-sync-hooks";

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
  const { data: project, isLoading: isLoadingProject } = useQuery(trpc.project.getById.queryOptions({ id: projectId }));
  const { data: chats, isLoading: isLoadingChats } = useGetAllChats();
  const [instructionsDialogOpen, setInstructionsDialogOpen] = useState(false);
  const [instructionsValue, setInstructionsValue] = useState("");
  const [renameProjectDialogOpen, setRenameProjectDialogOpen] = useState(false);

  const projectChats = useMemo(
    () => (chats ?? []).filter((c) => c.projectId === projectId),
    [chats, projectId]
  );

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

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="mx-auto w-full p-2 @[400px]:px-4 @[400px]:pb-4 md:max-w-3xl @[400px]:md:pb-6">
        {isLoadingProject ? (
          <Skeleton className="mb-3 h-8 w-48" />
        ) : project?.name ? (
          <div className="mb-3 flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setRenameProjectDialogOpen(true)}
              className="h-8 w-8"
            >
              <PencilEditIcon className="size-4" />
              <span className="sr-only">Rename project</span>
            </Button>
          </div>
        ) : null}

        <MultimodalInput
          chatId={chatId}
          parentMessageId={parentMessageId}
          status={status}
          disableSuggestedActions
        />

        <div className="mt-4">
          {isLoadingProject ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-40" />
              </CardContent>
            </Card>
          ) : project?.instructions && project.instructions.trim() ? (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-1 text-sm font-medium">Instructions</div>
                  <div className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {project.instructions}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenInstructionsDialog}
                  className="shrink-0"
                >
                  <PencilEditIcon />
                  <span className="sr-only">Edit instructions</span>
                </Button>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>
                  Add instructions to tailor AI responses.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  onClick={handleOpenInstructionsDialog}
                  variant="outline"
                >
                  Set instructions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {isLoadingChats ? (
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : projectChats.length > 0 ? (
          <div className="mt-4 space-y-2">
            {projectChats.map((chat) => (
              <ProjectChatCard
                key={chat.id}
                chat={chat}
                onDelete={deleteChat}
                onRename={async (chatId, title) => {
                  await renameChatMutation.mutateAsync({ chatId, title });
                  toast.success("Chat renamed successfully");
                }}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>No chats in this project</CardTitle>
                <CardDescription>
                  Start a chat to keep conversations organized and re-use project
                  knowledge.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        <Dialog open={instructionsDialogOpen} onOpenChange={handleCloseInstructionsDialog}>
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
                value={instructionsValue}
                onChange={(e) => setInstructionsValue(e.target.value)}
                placeholder="Enter project instructions..."
                className="min-h-[200px] resize-none"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseInstructionsDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveInstructions}
                disabled={setInstructionsMutation.isPending}
              >
                {setInstructionsMutation.isPending ? "Saving..." : "Save instructions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ProjectDetailsDialog
          open={renameProjectDialogOpen}
          onOpenChange={setRenameProjectDialogOpen}
          mode="edit"
          initialValue={project?.name}
          onSubmit={handleRenameProject}
          isLoading={renameProjectMutation.isPending}
        />
      </div>
    </div>
  );
}
