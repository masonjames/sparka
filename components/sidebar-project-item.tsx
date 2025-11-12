/* eslint-disable @typescript-eslint/consistent-type-definitions */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Project } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";

export function SidebarProjectItem({
  project,
  isActive,
}: {
  project: Project;
  isActive: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const renameMutation = useMutation(
    trpc.project.update.mutationOptions({
      // optimistic update similar to chat rename
      onMutate: async (variables) => {
        const listKey = trpc.project.list.queryKey();
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<Project[]>(listKey);
        const nextName =
          typeof variables.updates.name === "string"
            ? variables.updates.name
            : undefined;
        if (nextName) {
          queryClient.setQueryData<Project[] | undefined>(listKey, (old) =>
            old
              ? old.map((p) =>
                  p.id === variables.id ? { ...p, name: nextName } : p
                )
              : old
          );
        }
        return { previous };
      },
      onError: (_error, _variables, context) => {
        const listKey = trpc.project.list.queryKey();
        if (context?.previous) {
          queryClient.setQueryData(listKey, context.previous);
        }
        toast.error("Failed to rename project");
      },
      onSuccess: () => {
        toast.success("Project renamed");
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.project.list.queryKey(),
        });
      },
    })
  );

  const projectHref = `/group/${project.id}` as const;

  const handleRename = async () => {
    const trimmed = editName.trim();
    if (trimmed === "" || trimmed === project.name) {
      setIsEditing(false);
      setEditName(project.name);
      return;
    }
    try {
      await renameMutation.mutateAsync({
        id: project.id,
        updates: { name: trimmed },
      });
      setIsEditing(false);
    } catch {
      setEditName(project.name);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleRename();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditName(project.name);
    }
  };

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <div className="flex w-full items-center gap-2 overflow-hidden rounded-md bg-background p-2 text-left text-sm">
          <Input
            autoFocus
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            maxLength={255}
            onBlur={handleRename}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            value={editName}
          />
        </div>
      ) : (
        <SidebarMenuButton asChild isActive={isActive} className="cursor-pointer">
          <Link
            href={projectHref}
            prefetch={false}
          >
            <span>{project.name}</span>
          </Link>
        </SidebarMenuButton>
      )}

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground" showOnHover={!isActive}>
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              setIsEditing(true);
              setEditName(project.name);
            }}
          >
            <PencilEditIcon />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => setShowDeleteDialog(true)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteProjectDialog
        deleteId={project.id}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
      />
    </SidebarMenuItem>
  );
}


