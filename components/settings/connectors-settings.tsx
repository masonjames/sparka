"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Radio,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";
import { Favicon } from "../favicon";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Switch } from "../ui/switch";
import { McpConfigDialog } from "./mcp-config-dialog";
import { McpDetailsDialog } from "./mcp-details-dialog";
import { SettingsPageContent, SettingsPageScrollArea } from "./settings-page";

export function ConnectorsSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingConnector, setEditingConnector] = useState<McpConnector | null>(
    null
  );
  const [detailsConnector, setDetailsConnector] = useState<McpConnector | null>(
    null
  );

  const { data: connectors, isLoading } = useQuery(
    trpc.mcp.list.queryOptions()
  );

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

  const handleEdit = (connector: McpConnector) => {
    setEditingConnector(connector);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingConnector(null);
  };

  const handleViewDetails = (connector: McpConnector) => {
    setDetailsConnector(connector);
    setDetailsDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setDetailsDialogOpen(false);
    setDetailsConnector(null);
  };

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
        <Button onClick={() => setDialogOpen(true)} size="sm" variant="outline">
          <Plus className="size-4" />
          Add custom connector
        </Button>
      </div>

      <SettingsPageScrollArea>
        {connectors && connectors.length > 0 ? (
          <div className="space-y-3 px-1">
            {connectors.map((connector) => (
              <ConnectorRow
                connector={connector}
                key={connector.id}
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
      </SettingsPageScrollArea>

      <McpConfigDialog
        connector={editingConnector}
        onClose={handleDialogClose}
        open={dialogOpen}
      />

      <McpDetailsDialog
        connector={detailsConnector}
        onClose={handleDetailsDialogClose}
        open={detailsDialogOpen}
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
}: {
  connector: McpConnector;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}) {
  const isGlobal = connector.userId === null;
  const faviconUrl =
    connector.type === "http" ? getGoogleFaviconUrl(connector.url) : "";

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
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
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">{connector.name}</span>
          <Badge
            className="shrink-0 text-[10px]"
            variant={connector.type === "http" ? "default" : "secondary"}
          >
            {connector.type.toUpperCase()}
          </Badge>
          {isGlobal && (
            <Badge className="shrink-0 text-[10px]" variant="outline">
              Global
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-muted-foreground text-xs">
          {connector.url}
        </p>
      </div>

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
            {!isGlobal && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
