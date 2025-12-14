"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookText,
  Check,
  FileText,
  Globe,
  Loader2,
  Settings2,
  Wrench,
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";
import { Favicon } from "../favicon";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";
import { getUrlWithoutParams } from "../get-url-without-params";
import { Badge } from "../ui/badge";

export function McpDetailsDialog({
  open,
  onCloseAction,
  connector,
  onConnectAction,
  onConfigureAction,
  onToggleEnabledAction,
}: {
  open: boolean;
  onCloseAction: () => void;
  connector: McpConnector | null;
  onConnectAction: () => void;
  onConfigureAction: () => void;
  onToggleEnabledAction: (enabled: boolean) => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.mcp.discover.queryOptions({ id: connector?.id ?? "" }),
    enabled: open && connector !== null,
    retry: false,
  });

  const { data: authStatus } = useQuery({
    ...trpc.mcp.checkAuth.queryOptions({ id: connector?.id ?? "" }),
    enabled: open && connector !== null,
    staleTime: 30_000,
  });

  const isAuthenticated = authStatus?.isAuthenticated ?? false;

  const needsOAuth =
    error?.data?.code === "UNAUTHORIZED" &&
    error.message.includes("OAuth authorization");

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!connector) {
      return;
    }
    // When we come back from OAuth redirect, refresh auth + discovery.
    queryClient.invalidateQueries({
      queryKey: trpc.mcp.checkAuth.queryKey({ id: connector.id }),
    });
    refetch();
  }, [open, connector, queryClient, refetch, trpc.mcp.checkAuth]);

  useEffect(() => {
    if (!(open && connector && isAuthenticated)) {
      return;
    }
    // If we were previously unauthorized, refetch discovery after auth flips.
    queryClient.invalidateQueries({
      queryKey: trpc.mcp.discover.queryKey({ id: connector.id }),
    });
    refetch();
  }, [
    open,
    connector,
    isAuthenticated,
    queryClient,
    refetch,
    trpc.mcp.discover,
  ]);

  const faviconUrl =
    connector?.type === "http" ? getGoogleFaviconUrl(connector.url) : "";

  const isGlobal = connector?.userId === null;

  return (
    <Dialog onOpenChange={(o) => !o && onCloseAction()} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="overflow-hidden">
          <div className="flex items-start gap-3 overflow-hidden pr-8">
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
              {faviconUrl ? (
                <>
                  <Favicon className="size-5 rounded-sm" url={faviconUrl} />
                  <Globe className="hidden size-5 text-muted-foreground" />
                </>
              ) : (
                <Globe className="size-5 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">
                {connector?.name ?? "MCP"}
              </DialogTitle>
              <DialogDescription className="mt-0.5 truncate">
                {connector?.url ? getUrlWithoutParams(connector.url) : null}
              </DialogDescription>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {connector ? (
                  <Badge
                    className="h-5 px-2 text-[10px]"
                    variant={
                      connector.type === "http" ? "default" : "secondary"
                    }
                  >
                    {connector.type.toUpperCase()}
                  </Badge>
                ) : null}
                {isGlobal ? (
                  <Badge className="h-5 px-2 text-[10px]" variant="outline">
                    Global
                  </Badge>
                ) : null}
                <Badge
                  className="h-5 gap-1 px-2 text-[10px]"
                  variant={isAuthenticated ? "outline" : "secondary"}
                >
                  {isAuthenticated ? <Check className="size-3" /> : null}
                  {isAuthenticated ? "Authorized" : "Not authorized"}
                </Badge>
                {connector ? (
                  <div className="ml-1 flex items-center gap-2 rounded-md border bg-card px-2 py-1">
                    <span className="text-muted-foreground text-xs">
                      Enabled
                    </span>
                    <Switch
                      checked={connector.enabled}
                      onCheckedChange={onToggleEnabledAction}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {needsOAuth && isAuthenticated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {needsOAuth && !isAuthenticated ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <p className="font-medium text-sm">Authorization required</p>
              <p className="max-w-xs text-muted-foreground text-xs">
                Connect this connector to access its tools and resources.
              </p>
            </div>
          ) : null}

          {error && !needsOAuth && (
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
            <div className="space-y-4 pr-4">
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

        <DialogFooter>
          <div className="flex w-full flex-col-reverse justify-end gap-2 sm:flex-row sm:items-center">
            <Button
              disabled={!connector}
              onClick={onConfigureAction}
              variant="outline"
            >
              <Settings2 className="size-4" />
              Configure
            </Button>
            <Button disabled={!connector} onClick={onConnectAction}>
              {isAuthenticated ? "Reconnect" : "Connect"}
            </Button>
          </div>
        </DialogFooter>
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
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="font-medium text-sm">{title}</span>
        <span className="text-muted-foreground text-xs">({count})</span>
      </div>
      <Separator className="my-3" />
      {count === 0 ? (
        <p className="text-muted-foreground text-xs italic">None available</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((name) => (
            <span
              className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
              key={name}
              title={name}
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
