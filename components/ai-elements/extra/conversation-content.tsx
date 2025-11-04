import { cn } from "@/lib/utils";
import { ComponentProps } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { StickToBottom } from "use-stick-to-bottom";


export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => {
  const { scrollRef } = useStickToBottomContext();
  return (
    <ScrollArea
      className={cn("relative flex-1 overflow-y-auto")}
      ref={scrollRef}
    >
      <StickToBottom.Content className={cn("p-4", className)} {...props} />
    </ScrollArea>
  );
};