"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookText,
  FileText,
  Globe,
  Loader2,
  Wrench,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";
import { Favicon } from "../favicon";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";
import { getUrlWithoutParams } from "../get-url-without-params";

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

  const faviconUrl =
    connector?.type === "http" ? getGoogleFaviconUrl(connector.url) : "";

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              {faviconUrl ? (
                <>
                  <Favicon className="size-5 rounded-sm" url={faviconUrl} />
                  <Globe className="hidden size-5 text-muted-foreground" />
                </>
              ) : (
                <Globe className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">
                {connector?.name ?? "MCP"}
              </DialogTitle>
              <p className="mt-0.5 truncate text-muted-foreground text-xs">
                {connector?.url ? getUrlWithoutParams(connector.url) : null}
              </p>
            </div>
          </div>
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
            <div className="space-y-6 pr-4">
              <DetailsSection
                icon={<Wrench className="size-4" />}
                items={data.tools.map((t) => t.name)}
                title="Tools"
              />
              <DetailsSection
                icon={<FileText className="size-4" />}
                items={data.resources.map((r) => r.name)}
                title="Resources"
              />
              <DetailsSection
                icon={<BookText className="size-4" />}
                items={data.prompts.map((p) => p.name)}
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
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  const count = items.length;

  return (
    <div>
      <div className="flex items-center gap-2 px-1">
        {icon}
        <span className="font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-xs">({count})</span>
      </div>
      {count === 0 ? (
        <p className="mt-2 px-1 text-muted-foreground text-xs italic">
          None available
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((name) => (
            <span
              className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
              key={name}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
