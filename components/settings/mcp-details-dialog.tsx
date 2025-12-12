"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookText,
  FileText,
  Globe,
  Key,
  Loader2,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  openOAuthPopup,
  waitForOAuthComplete,
} from "@/lib/ai/mcp/oauth-redirect";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";
import { Favicon } from "../favicon";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";
import { getUrlWithoutParams } from "../get-url-without-params";

export function McpDetailsDialog({
  open,
  onCloseAction,
  connector,
}: {
  open: boolean;
  onCloseAction: () => void;
  connector: McpConnector | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const autoAuthTriggeredRef = useRef<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    ...trpc.mcp.discover.queryOptions({ id: connector?.id ?? "" }),
    enabled: open && connector !== null,
    retry: false,
  });

  const { mutateAsync: authorize } = useMutation(
    trpc.mcp.authorize.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Failed to initiate authorization");
      },
    })
  );

  // Check if error is an OAuth requirement
  const needsOAuth =
    error?.data?.code === "UNAUTHORIZED" &&
    error?.message?.includes("OAuth authorization");

  const handleAuthorize = useCallback(async () => {
    if (!connector) {
      return;
    }

    // Open popup immediately to avoid popup blocker
    const popup = openOAuthPopup();
    if (!popup) {
      toast.error("Failed to open popup. Please allow popups for this site.");
      return;
    }

    setIsAuthorizing(true);
    try {
      const result = await authorize({ id: connector.id });

      // Navigate popup to auth URL
      popup.setUrl(result.authorizationUrl);

      // Wait for OAuth to complete
      await waitForOAuthComplete({
        authWindow: popup.window,
        onSuccess: () => {
          toast.success("Successfully authorized!");
          queryClient.invalidateQueries({
            queryKey: trpc.mcp.checkAuth.queryKey({ id: connector.id }),
          });
          // Refetch discover to get tools/resources
          refetch();
        },
        onError: (oauthError) => {
          toast.error(oauthError.message || "Authorization failed");
        },
      });
    } catch (err) {
      popup.close();
      if (
        err instanceof Error &&
        !err.message.includes("does not require OAuth") &&
        !err.message.includes("cancelled")
      ) {
        console.error("Authorization error:", err);
      }
    } finally {
      setIsAuthorizing(false);
    }
  }, [authorize, connector, queryClient, refetch, trpc.mcp.checkAuth]);

  // Auto-trigger OAuth when connector requires it (only once per connector)
  useEffect(() => {
    if (
      needsOAuth &&
      connector &&
      !isAuthorizing &&
      autoAuthTriggeredRef.current !== connector.id
    ) {
      autoAuthTriggeredRef.current = connector.id;
      handleAuthorize();
    }
  }, [needsOAuth, connector, isAuthorizing, handleAuthorize]);

  // Reset auto-auth tracking when dialog closes
  useEffect(() => {
    if (!open) {
      autoAuthTriggeredRef.current = null;
    }
  }, [open]);

  const faviconUrl =
    connector?.type === "http" ? getGoogleFaviconUrl(connector.url) : "";

  return (
    <Dialog onOpenChange={(o) => !o && onCloseAction()} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden">
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
            <div className="min-w-0 flex-1">
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
              {needsOAuth ? (
                <>
                  <Key className="size-6 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    Authorization required
                  </p>
                  <p className="max-w-xs text-muted-foreground text-xs">
                    This connector requires OAuth authorization to access its
                    tools and resources.
                  </p>
                  <Button
                    className="mt-2"
                    disabled={isAuthorizing}
                    onClick={handleAuthorize}
                    size="sm"
                  >
                    {isAuthorizing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Authorizing...
                      </>
                    ) : (
                      <>
                        <Key className="size-4" />
                        Authorize
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <AlertCircle className="size-6 text-destructive" />
                  <p className="text-muted-foreground text-sm">
                    Failed to connect to MCP server
                  </p>
                  <p className="max-w-xs text-muted-foreground text-xs">
                    {error.message}
                  </p>
                </>
              )}
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
