"use client";

import { FolderPlus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useGetAllChats } from "@/hooks/chat-sync-hooks";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarProjects() {
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setOpenMobile } = useSidebar();
  const { data: projects, isLoading } = useQuery(trpc.project.list.queryOptions());
  const { data: allChats } = useGetAllChats();
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Auto-expand project if we're on a group route
  const currentGroupId = useMemo(() => {
    const match = pathname?.match(/^\/group\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  useMemo(() => {
    if (currentGroupId && !expandedProjects.has(currentGroupId)) {
      setExpandedProjects((prev) => new Set(prev).add(currentGroupId));
    }
  }, [currentGroupId, expandedProjects]);

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
      {!isLoading && projects?.map((project) => {
        const projectChats =
          allChats?.filter((chat) => chat.projectId === project.id) ?? [];
        const isExpanded = expandedProjects.has(project.id);
        const isActive = currentGroupId === project.id;
        const hasChats = projectChats.length > 0;
        const projectHref = `/group/${project.id}`;

        return (
          <SidebarMenuItem key={project.id}>
            {hasChats ? (
              <Collapsible
                open={isExpanded}
                onOpenChange={(open) => {
                  setExpandedProjects((prev) => {
                    const next = new Set(prev);
                    if (open) {
                      next.add(project.id);
                    } else {
                      next.delete(project.id);
                    }
                    return next;
                  });
                }}
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="cursor-pointer"
                  >
                    <Link
                      // @ts-expect-error - Next.js Link strict typing for dynamic routes
                      href={projectHref}
                    >
                      <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                      <span>{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {projectChats.map((chat) => {
                      const chatHref = `/group/${project.id}/chat/${chat.id}`;
                      return (
                        <SidebarMenuSubItem key={chat.id}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === chatHref}
                          >
                            <Link
                              // @ts-expect-error - Next.js Link strict typing for dynamic routes
                              href={chatHref}
                              onClick={() => setOpenMobile(false)}
                            >
                              <span>{chat.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuButton asChild isActive={isActive}>
                <Link
                  // @ts-expect-error - Next.js Link strict typing for dynamic routes
                  href={projectHref}
                >
                  <span>{project.name}</span>
                </Link>
              </SidebarMenuButton>
            )}
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

