"use client";

import { FolderPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/react";

export function SidebarProjects() {
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useQuery(trpc.project.list.queryOptions());
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Auto-expand project if we're on a group route
  const currentGroupId = useMemo(() => {
    const match = pathname?.match(/^\/group\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const createProjectMutation = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        setNewProjectDialogOpen(false);
        setNewProjectName("");
      },
    })
  );

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProjectMutation.mutate({ name: newProjectName.trim() });
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => setNewProjectDialogOpen(true)}
          className="cursor-pointer"
        >
          <FolderPlus className="size-4" />
          <span>New project</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {!isLoading &&
        projects?.map((project) => {
          const isActive = currentGroupId === project.id;
          const projectHref = `/group/${project.id}`;
          return (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton asChild isActive={isActive} className="cursor-pointer">
                <Link
                  // @ts-expect-error - Next.js Link strict typing for dynamic routes
                  href={projectHref}
                >
                  <span>{project.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}

      <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your chats.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateProject();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewProjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || createProjectMutation.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

