"use client"

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"
import { ComponentProps } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { StickToBottom } from "use-stick-to-bottom";
import { ScrollBar } from "@/components/ui/scroll-area";

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  dir = "ltr",
  children,
  ...props
}: ConversationContentProps) => {
  const  context= useStickToBottomContext();
  const { scrollRef, contentRef } = context;
  return (
    <ScrollAreaPrimitive.Root
    ref={scrollRef}
    className={cn("relative overflow-hidden h-full")}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
    ref={contentRef}
    className="h-full w-full rounded-[inherit]">
      <div className={className}>
        {typeof children === "function" ? children(context) : children}
      </div>
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
  );
};

