"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Loader2,
  MoreHorizontal,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import type { McpConnector } from "@/lib/db/schema";
import {
  type McpConnectorsDialog,
  mcpConnectorsSettingsSearchParams,
} from "@/lib/nuqs/mcp-search-params";
import { useTRPC } from "@/trpc/react";
import { useConfig } from "../config-provider";
import { Favicon } from "../favicon";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";
import { getUrlWithoutParams } from "../get-url-without-params";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { McpConfigDialog } from "./mcp-config-dialog";
import { McpConnectDialog } from "./mcp-connect-dialog";
import { McpDetailsDialog } from "./mcp-details-dialog";
import { SettingsPageContent } from "./settings-page";

export function ConnectorsSettings() {
  const trpc = useTRPC();
  const config = useConfig();
  const queryClient = useQueryClient();

  const [qs, setQs] = useQueryStates(mcpConnectorsSettingsSearchParams, {
    history: "replace",
    shallow: true,
  });

  const { data: connectors, isLoading } = useQuery(
    trpc.mcp.list.queryOptions()
  );

  // Derive dialog state from URL
  const dialogOpen = qs.dialog === "config";
  const detailsDialogOpen = qs.dialog === "details";
  const connectDialogOpen = qs.dialog === "connect";
  const editingConnector = useMemo(() => {
    if (!(dialogOpen && qs.connectorId && connectors)) {
      return null;
    }
    return connectors.find((c) => c.id === qs.connectorId) ?? null;
  }, [dialogOpen, qs.connectorId, connectors]);
  const detailsConnector = useMemo(() => {
    if (!(detailsDialogOpen && qs.connectorId && connectors)) {
      return null;
    }
    return connectors.find((c) => c.id === qs.connectorId) ?? null;
  }, [detailsDialogOpen, qs.connectorId, connectors]);
  const connectConnector = useMemo(() => {
    if (!(connectDialogOpen && qs.connectorId && connectors)) {
      return null;
    }
    return connectors.find((c) => c.id === qs.connectorId) ?? null;
  }, [connectDialogOpen, qs.connectorId, connectors]);

  const queryKey = trpc.mcp.list.queryKey();

  const { mutate: toggleEnabled } = useMutation(
    trpc.mcp.toggleEnabled.mutationOptions({
      onMutate: async (newData) => {
        await queryClient.cancelQueries({ queryKey });
        const prev = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: typeof connectors) => {
          if (!old) {
            return old;
          }
          return old.map((c) =>
            c.id === newData.id ? { ...c, enabled: newData.enabled } : c
          );
        });
        return { prev };
      },
      onError: (_err, _newData, context) => {
        queryClient.setQueryData(queryKey, context?.prev);
        toast.error("Failed to update connector");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    })
  );

  const { mutate: deleteConnector } = useMutation(
    trpc.mcp.delete.mutationOptions({
      onMutate: async (data) => {
        await queryClient.cancelQueries({ queryKey });
        const prev = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: typeof connectors) => {
          if (!old) {
            return old;
          }
          return old.filter((c) => c.id !== data.id);
        });
        return { prev };
      },
      onError: (_err, _data, context) => {
        queryClient.setQueryData(queryKey, context?.prev);
        toast.error("Failed to delete connector");
      },
      onSuccess: () => {
        toast.success("Connector removed");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    })
  );

  const { mutate: disconnectConnector, isPending: isDisconnecting } =
    useMutation(
      trpc.mcp.disconnect.mutationOptions({
        onSuccess: () => {
          toast.success("Disconnected");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to disconnect");
        },
        onSettled: (_data, _err, vars) => {
          queryClient.invalidateQueries({ queryKey });
          queryClient.invalidateQueries({
            queryKey: trpc.mcp.checkAuth.queryKey({ id: vars.id }),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.mcp.discover.queryKey({ id: vars.id }),
          });
        },
      })
    );

  const setDialogState = useCallback(
    ({
      dialog,
      connectorId,
    }: {
      dialog: McpConnectorsDialog | null;
      connectorId?: string | null;
    }) => {
      setQs({
        dialog,
        connectorId: connectorId ?? null,
      });
    },
    [setQs]
  );

  const handleOpenConfigDialog = useCallback(
    (connectorId?: string) => {
      setDialogState({ dialog: "config", connectorId: connectorId ?? null });
    },
    [setDialogState]
  );

  const handleConnectorCreated = useCallback(
    async (connector: McpConnector) => {
      // Ensure the newly-created connector is immediately available for dialogs
      // even before the list query refetch completes.
      queryClient.setQueryData(
        queryKey,
        (old: typeof connectors): typeof connectors => {
          if (!old) {
            return [connector];
          }
          if (old.some((c) => c.id === connector.id)) {
            return old;
          }
          return [connector, ...old];
        }
      );

      // Auto-open connect dialog if the server requires OAuth.
      try {
        await queryClient.fetchQuery({
          ...trpc.mcp.discover.queryOptions({ id: connector.id }),
          retry: false,
          staleTime: 0,
        });
      } catch (err) {
        if (isOAuthRequiredDiscoverError(err)) {
          setDialogState({ dialog: "connect", connectorId: connector.id });
          return;
        }
      }

      // Preserve previous behavior (just close) when OAuth isn't required.
      setDialogState({ dialog: null });
    },
    [connectors, queryClient, queryKey, setDialogState, trpc.mcp.discover]
  );

  const handleDialogClose = () => {
    setDialogState({ dialog: null });
  };

  const handleViewDetails = useCallback(
    (connector: McpConnector) => {
      setDialogState({ dialog: "details", connectorId: connector.id });
    },
    [setDialogState]
  );

  const handleDetailsDialogClose = () => {
    setDialogState({ dialog: null });
  };

  const handleOpenConnectDialog = useCallback(
    (connector: McpConnector) => {
      setDialogState({ dialog: "connect", connectorId: connector.id });
    },
    [setDialogState]
  );

  const handleConnectDialogClose = useCallback(() => {
    if (qs.connectorId) {
      setDialogState({ dialog: "details", connectorId: qs.connectorId });
      return;
    }
    setDialogState({ dialog: null });
  }, [qs.connectorId, setDialogState]);

  useEffect(() => {
    if (qs.connected) {
      toast.success("Authorization successful");
      setQs({ connected: null });
    }
    if (qs.error) {
      toast.error(qs.error);
      setQs({ error: null });
    }
  }, [qs.connected, qs.error, setQs]);

  const handleDetailsConnect = useCallback(() => {
    if (!detailsConnector) {
      return;
    }
    handleOpenConnectDialog(detailsConnector);
  }, [detailsConnector, handleOpenConnectDialog]);

  const handleDetailsConfigure = useCallback(() => {
    if (!detailsConnector) {
      return;
    }
    setDialogState({ dialog: "config", connectorId: detailsConnector.id });
  }, [detailsConnector, setDialogState]);

  const handleDetailsToggleEnabled = useCallback(
    (enabled: boolean) => {
      if (!detailsConnector) {
        return;
      }
      toggleEnabled({ id: detailsConnector.id, enabled });
    },
    [detailsConnector, toggleEnabled]
  );

  if (!config.integrations.mcp) {
    return (
      <SettingsPageContent className="gap-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="font-medium text-sm">MCP is not enabled</p>
        </div>
      </SettingsPageContent>
    );
  }
  if (isLoading) {
    return (
      <SettingsPageContent className="gap-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div className="h-20 rounded-lg bg-muted/50" key={i} />
          ))}
        </div>
      </SettingsPageContent>
    );
  }

  const customConnectors = (connectors ?? []).filter((c) => c.userId !== null);
  const globalConnectors = (connectors ?? []).filter((c) => c.userId === null);

  return (
    <SettingsPageContent className="gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Custom connectors</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Connect MCP servers you trust to extend your AI with tools.
          </p>
        </div>
        <Button onClick={() => handleOpenConfigDialog()} size="sm">
          <Plus className="size-4" />
          Add custom connector
        </Button>
      </div>

      {customConnectors.length > 0 ? (
        <div className="space-y-2">
          {customConnectors.map((connector) => (
            <CustomConnectorRow
              connector={connector}
              isDisconnecting={isDisconnecting}
              key={connector.id}
              onConnect={() => handleOpenConnectDialog(connector)}
              onDisconnect={() => disconnectConnector({ id: connector.id })}
              onRemove={() => deleteConnector({ id: connector.id })}
              onViewDetails={() => handleViewDetails(connector)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Radio className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">No custom connectors</p>
          <p className="mt-1 max-w-sm text-muted-foreground text-xs">
            Add a custom MCP connector to access tools from your services.
          </p>
        </div>
      )}

      {globalConnectors.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-sm">Built-in connectors</p>
          <div className="space-y-2">
            {globalConnectors.map((connector) => (
              <BuiltInConnectorRow
                connector={connector}
                key={connector.id}
                onViewDetails={() => handleViewDetails(connector)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <McpConfigDialog
        connector={editingConnector}
        onClose={handleDialogClose}
        onCreated={handleConnectorCreated}
        open={dialogOpen}
      />

      <McpDetailsDialog
        connector={detailsConnector}
        onCloseAction={handleDetailsDialogClose}
        onConfigureAction={handleDetailsConfigure}
        onConnectAction={handleDetailsConnect}
        onToggleEnabledAction={handleDetailsToggleEnabled}
        open={detailsDialogOpen}
      />

      <McpConnectDialog
        connector={connectConnector}
        onClose={handleConnectDialogClose}
        open={connectDialogOpen}
      />
    </SettingsPageContent>
  );
}

function isOAuthRequiredDiscoverError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const anyErr = error as {
    data?: { code?: string };
    message?: string;
  };
  return (
    anyErr.data?.code === "UNAUTHORIZED" &&
    typeof anyErr.message === "string" &&
    anyErr.message.includes("OAuth authorization")
  );
}

function CustomConnectorRow({
  connector,
  onRemove,
  onViewDetails,
  onConnect,
  onDisconnect,
  isDisconnecting,
}: {
  connector: McpConnector;
  onRemove: () => void;
  onViewDetails: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  isDisconnecting: boolean;
}) {
  const trpc = useTRPC();
  const faviconUrl =
    connector.type === "http" ? getGoogleFaviconUrl(connector.url) : "";

  const { data: authStatus } = useQuery({
    ...trpc.mcp.checkAuth.queryOptions({ id: connector.id }),
    staleTime: 30_000,
  });

  const {
    isLoading: isDiscovering,
    error: discoverError,
    data: discovery,
  } = useQuery({
    ...trpc.mcp.discover.queryOptions({ id: connector.id }),
    staleTime: 15_000,
    retry: false,
  });

  const needsOAuth = isOAuthRequiredDiscoverError(discoverError);
  const isConfigured = Boolean(discovery) && !needsOAuth;
  const toolsCount = discovery?.tools.length ?? 0;

  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-xl border bg-card px-4 py-3">
      <button
        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
        onClick={onViewDetails}
        type="button"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
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
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate font-medium text-sm">
              {connector.name}
            </span>
            <Badge
              className="h-5 shrink-0 px-2 text-[10px]"
              variant="secondary"
            >
              CUSTOM
            </Badge>
          </div>
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {getUrlWithoutParams(connector.url)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isDiscovering
              ? "Checking tools…"
              : needsOAuth
                ? "Authorization required"
                : isConfigured
                  ? `${toolsCount} tool${toolsCount === 1 ? "" : "s"} available`
                  : "Unable to reach server"}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          disabled={isDiscovering}
          onClick={needsOAuth ? onConnect : onViewDetails}
          size="sm"
          variant={needsOAuth ? "outline" : "default"}
        >
          {isDiscovering ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading
            </>
          ) : needsOAuth ? (
            "Connect"
          ) : (
            "Configure"
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {authStatus?.isAuthenticated ? (
              <>
                <DropdownMenuItem
                  disabled={isDisconnecting}
                  onClick={onDisconnect}
                >
                  Disconnect
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="size-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function BuiltInConnectorRow({
  connector,
  onViewDetails,
}: {
  connector: McpConnector;
  onViewDetails: () => void;
}) {
  const faviconUrl =
    connector.type === "http" ? getGoogleFaviconUrl(connector.url) : "";
  return (
    <button
      className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left"
      onClick={onViewDetails}
      type="button"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
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
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="truncate font-medium text-sm">{connector.name}</span>
          <Badge className="h-5 shrink-0 px-2 text-[10px]" variant="outline">
            Built-in
          </Badge>
        </div>
        <p className="mt-1 truncate text-muted-foreground text-xs">
          {getUrlWithoutParams(connector.url)}
        </p>
      </div>
      <span className="text-muted-foreground text-xs">View</span>
    </button>
  );
}
