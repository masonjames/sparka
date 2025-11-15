"use client";

import { FolderPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarProjectItem } from "@/components/sidebar-project-item";
import { ProjectDetailsDialog } from "@/components/project-details-dialog";
import { useTRPC } from "@/trpc/react";

export function SidebarProjects() {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useQuery(trpc.project.list.queryOptions());
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);

  // Auto-expand project if we're on a group route
  const currentGroupId = useMemo(() => {
    const match = pathname?.match(/^\/group\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const createProjectMutation = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        setNewProjectDialogOpen(false);
        router.push(`/group/${data.id}`);
      },
    })
  );

  const handleCreateProject = (name: string) => {
    createProjectMutation.mutate({ name });
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
          return <SidebarProjectItem key={project.id} project={project} isActive={isActive} />;
        })}

      <ProjectDetailsDialog
        open={newProjectDialogOpen}
        onOpenChange={setNewProjectDialogOpen}
        mode="create"
        onSubmit={handleCreateProject}
        isLoading={createProjectMutation.isPending}
      />
    </>
  );
}

