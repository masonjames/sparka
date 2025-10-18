import Link from 'next/link';
import { Cpu } from 'lucide-react';
import { SearchChatsButton } from '@/components/search-chats';
import { NewChatButton } from '@/components/new-chat-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { SidebarTopRow } from '@/components/sidebar-top-row';
import { AppSidebarHistoryConditional } from './app-sidebar-history-conditional';
import { AppSidebarFooterConditional } from './app-sidebar-footer-conditional';

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0 grid grid-rows-[auto_1fr_auto] max-h-dvh"
    >
      <SidebarHeader className="shrink-0">
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <SidebarTopRow />
          </div>

          <NewChatButton />

          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Models" asChild>
              <Link href="/models">
                <Cpu className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Models
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <ScrollArea className="relative flex-1 overflow-y-auto">
        <SidebarContent className="max-w-(--sidebar-width) pr-2">
          <AppSidebarHistoryConditional />
        </SidebarContent>
      </ScrollArea>

      <AppSidebarFooterConditional />
    </Sidebar>
  );
}
