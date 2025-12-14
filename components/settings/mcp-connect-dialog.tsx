"use client";

import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";
import { Favicon } from "../favicon";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";
import { getUrlWithoutParams } from "../get-url-without-params";

export function McpConnectDialog({
  open,
  onClose,
  connector,
}: {
  open: boolean;
  onClose: () => void;
  connector: McpConnector | null;
}) {
  const trpc = useTRPC();

  const faviconUrl = useMemo(() => {
    if (!connector) {
      return "";
    }
    return connector.type === "http" ? getGoogleFaviconUrl(connector.url) : "";
  }, [connector]);

  const { mutateAsync: authorize, isPending } = useMutation(
    trpc.mcp.authorize.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Failed to start connection");
      },
    })
  );

  const handleContinue = useCallback(async () => {
    if (!connector) {
      return;
    }
    const { authorizationUrl } = await authorize({ id: connector.id });
    // Full-page navigation (no popup). Provider will redirect back to our callback.
    window.location.href = authorizationUrl;
  }, [authorize, connector]);

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="sm:max-w-md">
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
            <div className="min-w-0 flex-1 overflow-hidden">
              <DialogTitle className="truncate">
                Connect {connector?.name ?? "connector"}
              </DialogTitle>
              <DialogDescription className="truncate">
                {connector?.url ? getUrlWithoutParams(connector.url) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          You’ll be redirected to complete authentication and then brought back
          here.
        </p>

        <DialogFooter>
          <Button disabled={isPending} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={isPending || !connector} onClick={handleContinue}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <ExternalLink className="size-4" />
                Continue to {connector?.name ?? "connector"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
