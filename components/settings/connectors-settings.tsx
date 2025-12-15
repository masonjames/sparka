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
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { McpConnectDialog } from "./mcp-connect-dialog";
import { McpCreateDialog } from "./mcp-create-dialog";
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

  const configOpen = qs.dialog === "config";
  const connectOpen = qs.dialog === "connect";

  const editingConnector = useMemo(() => {
    if (!(configOpen && qs.connectorId && connectors)) {
      return null;
    }
    return connectors.find((c) => c.id === qs.connectorId) ?? null;
  }, [configOpen, qs.connectorId, connectors]);

  const connectConnector = useMemo(() => {
    if (!(connectOpen && qs.connectorId && connectors)) {
      return null;
    }
    return connectors.find((c) => c.id === qs.connectorId) ?? null;
  }, [connectOpen, qs.connectorId, connectors]);

  const queryKey = trpc.mcp.list.queryKey();

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

  const handleDialogClose = () => {
    setDialogState({ dialog: null });
  };

  const handleOpenConnectDialog = useCallback(
    (connectorId: string) => {
      setDialogState({ dialog: "connect", connectorId });
    },
    [setDialogState]
  );

  const handleConnectDialogClose = useCallback(() => {
    setDialogState({ dialog: null });
  }, [setDialogState]);

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
              onConfigure={() => handleOpenConfigDialog(connector.id)}
              onConnect={() => handleOpenConnectDialog(connector.id)}
              onDisconnect={() => disconnectConnector({ id: connector.id })}
              onRemove={() => deleteConnector({ id: connector.id })}
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
              <BuiltInConnectorRow connector={connector} key={connector.id} />
            ))}
          </div>
        </div>
      ) : null}

      <McpCreateDialog
        connector={editingConnector}
        onClose={handleDialogClose}
        open={configOpen}
      />

      <McpConnectDialog
        connector={connectConnector}
        onClose={handleConnectDialogClose}
        open={connectOpen}
      />
    </SettingsPageContent>
  );
}

function CustomConnectorRow({
  connector,
  onConfigure,
  onConnect,
  onRemove,
  onDisconnect,
  isDisconnecting,
}: {
  connector: McpConnector;
  onConfigure: () => void;
  onConnect: () => void;
  onRemove: () => void;
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

  const { isLoading: isTestingConnection, data: connectionStatus } = useQuery({
    ...trpc.mcp.testConnection.queryOptions({ id: connector.id }),
    staleTime: 30_000,
    retry: false,
  });

  const needsOAuth = connectionStatus?.needsAuth ?? false;
  const isConnected = connectionStatus?.status === "connected";

  const statusText = (() => {
    if (isTestingConnection) {
      return "Checking connection…";
    }
    if (needsOAuth) {
      return "Authorization required";
    }
    if (isConnected) {
      return "Connected";
    }
    return "Unable to reach server";
  })();

  const actionLabel = (() => {
    if (isTestingConnection) {
      return "Loading";
    }
    if (needsOAuth) {
      return "Connect";
    }
    return "Details";
  })();

  const href: `/settings/connectors/${string}` = `/settings/connectors/${connector.id}`;

  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-xl border bg-card px-4 py-3">
      <Link
        className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden text-left"
        href={href}
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
          <p className="mt-1 text-[11px] text-muted-foreground">{statusText}</p>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {needsOAuth ? (
          <Button
            disabled={isTestingConnection}
            onClick={onConnect}
            size="sm"
            variant="outline"
          >
            {isTestingConnection ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading
              </>
            ) : (
              actionLabel
            )}
          </Button>
        ) : (
          <Button
            asChild
            disabled={isTestingConnection}
            size="sm"
            variant="outline"
          >
            <Link href={href}>
              {isTestingConnection ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Loading
                </>
              ) : (
                actionLabel
              )}
            </Link>
          </Button>
        )}
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
              onClick={(e) => {
                e.preventDefault();
                onConfigure();
              }}
            >
              Configure
            </DropdownMenuItem>
            {needsOAuth ? (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onConnect();
                  }}
                >
                  Connect
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : (
              <DropdownMenuSeparator />
            )}
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

function BuiltInConnectorRow({ connector }: { connector: McpConnector }) {
  const faviconUrl =
    connector.type === "http" ? getGoogleFaviconUrl(connector.url) : "";
  const href: `/settings/connectors/${string}` = `/settings/connectors/${connector.id}`;
  return (
    <Link
      className="flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left"
      href={href}
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
    </Link>
  );
}
