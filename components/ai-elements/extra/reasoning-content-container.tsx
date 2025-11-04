import { ComponentProps } from "react";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { memo } from "react";


export type ReasoningContentContainerProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: React.ReactNode;
};


export const ReasoningContentContainer = memo(
  ({ className, children, ...props }: ReasoningContentContainerProps) => (
    <CollapsibleContent
      className={cn(
        "mt-4 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in",
        className
      )}
      {...props}
    >
      {children}
    </CollapsibleContent>
  )
);