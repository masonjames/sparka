"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Eye,
  Globe,
  Key,
  MoreHorizontal,
  Pencil,
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
import { Switch } from "../ui/switch";
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
        toast.success("Connector deleted");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
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

  const handleEdit = (connector: McpConnector) => {
    handleOpenConfigDialog(connector.id);
  };

  const handleDialogClose = () => {
    setDialogState({ dialog: null });
  };

  const handleViewDetails = (connector: McpConnector) => {
    setDialogState({ dialog: "details", connectorId: connector.id });
  };

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

  // Callback when a new connector is created - check auth and transition accordingly
  const handleConnectorCreated = useCallback(
    async (connector: McpConnector) => {
      // Check if connector needs OAuth authorization
      try {
        const authStatus = await queryClient.fetchQuery({
          ...trpc.mcp.checkAuth.queryOptions({ id: connector.id }),
          staleTime: 0,
        });

        if (authStatus.isAuthenticated) {
          // Already authenticated, go to details
          setDialogState({ dialog: "details", connectorId: connector.id });
        } else {
          // Needs auth, show connect dialog first
          setDialogState({ dialog: "connect", connectorId: connector.id });
        }
      } catch {
        // If check fails, default to connect dialog (likely needs auth)
        setDialogState({ dialog: "connect", connectorId: connector.id });
      }
    },
    [setDialogState, queryClient, trpc.mcp.checkAuth]
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

  return (
    <SettingsPageContent className="gap-4">
      <div className="flex shrink-0 gap-2">
        <Button
          onClick={() => handleOpenConfigDialog()}
          size="sm"
          variant="outline"
        >
          <Plus className="size-4" />
          Add custom connector
        </Button>
      </div>

      {connectors && connectors.length > 0 ? (
        <div className="space-y-3 px-1">
          {connectors.map((connector) => (
            <ConnectorRow
              connector={connector}
              key={connector.id}
              onConnect={() => handleOpenConnectDialog(connector)}
              onDelete={() => deleteConnector({ id: connector.id })}
              onEdit={() => handleEdit(connector)}
              onToggle={(enabled) =>
                toggleEnabled({ id: connector.id, enabled })
              }
              onViewDetails={() => handleViewDetails(connector)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-3">
            <Radio className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium text-sm">No connectors configured</p>
          <p className="mt-1 max-w-sm text-muted-foreground text-xs">
            Add an MCP connector to extend your AI with external tools and
            capabilities.
          </p>
        </div>
      )}

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

function ConnectorRow({
  connector,
  onToggle,
  onEdit,
  onDelete,
  onViewDetails,
  onConnect,
}: {
  connector: McpConnector;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
  onConnect: () => void;
}) {
  const trpc = useTRPC();
  const isGlobal = connector.userId === null;
  const faviconUrl =
    connector.type === "http" ? getGoogleFaviconUrl(connector.url) : "";

  // Query to check OAuth status
  const { data: authStatus } = useQuery({
    ...trpc.mcp.checkAuth.queryOptions({ id: connector.id }),
    staleTime: 30_000, // Cache for 30 seconds
  });

  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-lg border bg-card p-4">
      <button
        className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden text-left"
        onClick={onViewDetails}
        type="button"
      >
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
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="truncate font-medium text-sm">
              {connector.name}
            </span>
            <Badge
              className="h-5 shrink-0 px-2 text-[10px]"
              variant={connector.type === "http" ? "default" : "secondary"}
            >
              {connector.type.toUpperCase()}
            </Badge>
            {isGlobal && (
              <Badge
                className="h-5 shrink-0 px-2 text-[10px]"
                variant="outline"
              >
                Global
              </Badge>
            )}
            {authStatus?.isAuthenticated && (
              <Badge
                className="h-5 shrink-0 gap-1 px-2 text-[10px]"
                variant="outline"
              >
                <Check className="size-3" />
                Authorized
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-muted-foreground text-xs">
            {getUrlWithoutParams(connector.url)}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <Switch checked={connector.enabled} onCheckedChange={onToggle} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onViewDetails}>
              <Eye className="size-4" />
              Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" />
              Configure
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onConnect}>
              <Key className="size-4" />
              {authStatus?.isAuthenticated ? "Reconnect" : "Connect"}
            </DropdownMenuItem>
            {!isGlobal && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
