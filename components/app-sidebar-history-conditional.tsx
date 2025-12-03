"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { SidebarHistory } from "@/components/sidebar-history";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/providers/session-provider";

export function AppSidebarHistoryConditional() {
  const { open, openMobile } = useSidebar();
  const { data: session } = useSession();

  if (!(open || openMobile)) {
    return null;
  }

  if (!session?.user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <Empty className="border-none p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LogIn className="size-4" />
              </EmptyMedia>
              <EmptyDescription>
                Sign in to save your chat history
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm" variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return <SidebarHistory />;
}
