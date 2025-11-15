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
import { ProjectChatItem } from "@/components/project-chat-item";
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
              <PencilEditIcon size={16} />
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Instructions</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenInstructionsDialog}
                    className="h-8 w-8"
                  >
                    <PencilEditIcon size={16} />
                    <span className="sr-only">Edit instructions</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {project.instructions}
                </div>
              </CardContent>
            </Card>
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

        <div className="mt-4 space-y-2">
          {isLoadingChats ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
              >
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))
          ) : projectChats.length > 0 ? (
            projectChats.map((chat) => (
              <ProjectChatItem
                key={chat.id}
                chat={chat}
                onDelete={deleteChat}
                onRename={async (chatId, title) => {
                  await renameChatMutation.mutateAsync({ chatId, title });
                  toast.success("Chat renamed successfully");
                }}
              />
            ))
          ) : (
            <div className="rounded-xl border border-border/60 px-4 py-6">
              <p className="text-sm font-medium text-foreground">No chats in this project</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a chat to keep conversations organized and re-use project knowledge.
              </p>
            </div>
          )}
        </div>

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
