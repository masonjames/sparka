"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";

export function McpConnectorDialog({
  open,
  onClose,
  connector,
}: {
  open: boolean;
  onClose: () => void;
  connector: McpConnector | null;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.mcp.list.queryKey();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"http" | "sse">("http");
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isEditing = connector !== null;

  useEffect(() => {
    if (open) {
      if (connector) {
        setName(connector.name);
        setUrl(connector.url);
        setType(connector.type as "http" | "sse");
        setOauthClientId(connector.oauthClientId ?? "");
        setOauthClientSecret(connector.oauthClientSecret ?? "");
        setAdvancedOpen(
          Boolean(connector.oauthClientId || connector.oauthClientSecret)
        );
      } else {
        setName("");
        setUrl("");
        setType("http");
        setOauthClientId("");
        setOauthClientSecret("");
        setAdvancedOpen(false);
      }
    }
  }, [open, connector]);

  const { mutate: createConnector, isPending: isCreating } = useMutation(
    trpc.mcp.create.mutationOptions({
      onSuccess: () => {
        toast.success("Connector added");
        queryClient.invalidateQueries({ queryKey });
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to add connector");
      },
    })
  );

  const { mutate: updateConnector, isPending: isUpdating } = useMutation(
    trpc.mcp.update.mutationOptions({
      onSuccess: () => {
        toast.success("Connector updated");
        queryClient.invalidateQueries({ queryKey });
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update connector");
      },
    })
  );

  const isPending = isCreating || isUpdating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!(name.trim() && url.trim())) {
      toast.error("Name and URL are required");
      return;
    }

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    if (isEditing && connector) {
      updateConnector({
        id: connector.id,
        updates: {
          name: name.trim(),
          url: url.trim(),
          type,
          oauthClientId: oauthClientId.trim() || null,
          oauthClientSecret: oauthClientSecret.trim() || null,
        },
      });
    } else {
      createConnector({
        name: name.trim(),
        url: url.trim(),
        type,
        oauthClientId: oauthClientId.trim() || undefined,
        oauthClientSecret: oauthClientSecret.trim() || undefined,
      });
    }
  };

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Configure connector" : "Add custom connector"}
          </DialogTitle>
          <DialogDescription>
            Connect to an MCP server to extend AI capabilities with external
            tools.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="MCP Example"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mcp-server.example.com/mcp"
              type="url"
              value={url}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Transport Type</Label>
            <Select
              onValueChange={(v) => setType(v as "http" | "sse")}
              value={type}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="http">HTTP (Streamable)</SelectItem>
                <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Collapsible onOpenChange={setAdvancedOpen} open={advancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                className="w-full justify-between"
                size="sm"
                type="button"
                variant="ghost"
              >
                Advanced settings
                <ChevronDown
                  className={`size-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="oauthClientId">
                  OAuth Client ID (optional)
                </Label>
                <Input
                  id="oauthClientId"
                  onChange={(e) => setOauthClientId(e.target.value)}
                  placeholder="Enter client ID"
                  value={oauthClientId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauthClientSecret">
                  OAuth Client Secret (optional)
                </Label>
                <Input
                  id="oauthClientSecret"
                  onChange={(e) => setOauthClientSecret(e.target.value)}
                  placeholder="Enter client secret"
                  type="password"
                  value={oauthClientSecret}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex gap-2">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <p className="font-medium text-amber-500 text-sm">
                  Confirm that you trust this connector
                </p>
                <p className="text-muted-foreground text-xs">
                  This connector has not been verified. You are responsible for
                  all actions taken with this connector.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving..." : isEditing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
