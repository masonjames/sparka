"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookText,
  ChevronDown,
  FileText,
  Loader2,
  Wrench,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";

export function McpDetailsDialog({
  open,
  onClose,
  connector,
}: {
  open: boolean;
  onClose: () => void;
  connector: McpConnector | null;
}) {
  const trpc = useTRPC();

  const { data, isLoading, error } = useQuery({
    ...trpc.mcp.discover.queryOptions({ id: connector?.id ?? "" }),
    enabled: open && connector !== null,
  });

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{connector?.name ?? "MCP"} — Details</DialogTitle>
          <DialogDescription className="truncate">
            {connector?.url}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-muted-foreground text-sm">
                Failed to connect to MCP server
              </p>
              <p className="max-w-xs text-muted-foreground text-xs">
                {error.message}
              </p>
            </div>
          )}

          {data && (
            <div className="space-y-2 pr-4">
              <DetailsSection
                defaultOpen
                icon={<Wrench className="size-4" />}
                items={data.tools.map((t) => ({
                  name: t.name,
                  description: t.description,
                }))}
                title="Tools"
              />
              <DetailsSection
                icon={<FileText className="size-4" />}
                items={data.resources.map((r) => ({
                  name: r.name,
                  description: r.description,
                  extra: r.uri,
                }))}
                title="Resources"
              />
              <DetailsSection
                icon={<BookText className="size-4" />}
                items={data.prompts.map((p) => ({
                  name: p.name,
                  description: p.description,
                  extra:
                    p.arguments.length > 0
                      ? `Args: ${p.arguments.map((a) => a.name).join(", ")}`
                      : undefined,
                }))}
                title="Prompts"
              />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function DetailsSection({
  title,
  icon,
  items,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; description: string | null; extra?: string }[];
  defaultOpen?: boolean;
}) {
  const count = items.length;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted/50">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-muted-foreground text-xs">({count})</span>
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {count === 0 ? (
          <p className="px-3 py-2 text-muted-foreground text-xs italic">
            None available
          </p>
        ) : (
          <div className="space-y-1 py-1">
            {items.map((item) => (
              <div
                className="rounded-md px-3 py-2 hover:bg-muted/30"
                key={item.name}
              >
                <p className="font-mono text-sm">{item.name}</p>
                {item.description && (
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {item.description}
                  </p>
                )}
                {item.extra && (
                  <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                    {item.extra}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
