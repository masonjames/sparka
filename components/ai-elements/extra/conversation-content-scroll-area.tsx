"use client";

/**
 * This is a modified version of the Conversation component that avoids overscrolling and uses a shadcn scroll area.
 * Can be added to AI Elements if the shadcn scroll area PR is merged.
 * Undo after this PR is merged: https://github.com/shadcn-ui/ui/pull/8925/files
 */


import { ScrollArea } from "@/components/ui/extra/scroll-area-viewport-ref";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";



export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  children,
  ...props
}: ConversationContentProps) =>{
  const context = useStickToBottomContext();

  return (
    <ScrollArea
      className="h-full w-full *:data-radix-scroll-area-viewport:overscroll-contain *:data-radix-scroll-area-viewport:contain-strict"
      viewportRef={context.scrollRef}
    >
      <div
        {...props}
        className={cn("flex flex-col gap-8 p-4", className)}
        ref={context.contentRef}
      >
        {typeof children === "function" ? children(context) : children}
      </div>
    </ScrollArea>
  );
};
