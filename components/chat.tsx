"use client";
import { MainChatPanel } from "@/components/chat/main-chat-panel";
import { SecondaryChatPanel } from "@/components/chat/secondary-chat-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useSidebar } from "@/components/ui/sidebar";
import { useArtifactSelector } from "@/hooks/use-artifact";
import type { ChatMessage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

function useIsSecondaryChatPanelVisible() {
  return useArtifactSelector((state) => state.isVisible);
}

export function Chat({
  id,
  initialMessages: _initialMessages,
  isReadonly,
  isProjectPage,
  projectId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  isProjectPage?: boolean;
  projectId?: string;
}) {
  const { state: sidebarState } = useSidebar();
  const isSecondaryPanelVisible = useIsSecondaryChatPanelVisible();

  return (
    <div
      className={cn(
        "@container flex h-dvh min-w-0 max-w-screen flex-col bg-background md:max-w-[calc(100vw-var(--sidebar-width))]",
        sidebarState === "collapsed" && "md:max-w-screen"
      )}
    >
      <ResizablePanelGroup className="h-full w-full" direction="horizontal">
        <ResizablePanel
          className={isSecondaryPanelVisible ? "hidden md:block" : undefined}
          defaultSize={65}
          minSize={40}
        >
          <MainChatPanel
            chatId={id}
            className={cn("flex h-full min-w-0 flex-1 flex-col")}
            isProjectPage={isProjectPage}
            isReadonly={isReadonly}
            projectId={projectId}
          />
        </ResizablePanel>
        {/* TODO: Introduce withHandle prop to resizable ResizableHandle component and make sure it's in the middle */}
        {isSecondaryPanelVisible && (
          <ResizableHandle className="hidden md:block" />
        )}
        {isSecondaryPanelVisible && (
          <ResizablePanel defaultSize={35} minSize={25}>
            <SecondaryChatPanel
              chatId={id}
              className="flex h-full min-w-0 flex-1 flex-col"
              isReadonly={isReadonly}
            />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
