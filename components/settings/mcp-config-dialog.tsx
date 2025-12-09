"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MCP_NAME_MAX_LENGTH } from "@/lib/ai/mcp-name-id";
import type { McpConnector } from "@/lib/db/schema";
import { useTRPC } from "@/trpc/react";

const mcpConnectorFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Name is required" })
    .max(MCP_NAME_MAX_LENGTH, {
      message: `Name must be at most ${MCP_NAME_MAX_LENGTH} characters`,
    }),
  url: z
    .string()
    .min(1, { message: "URL is required" })
    .url({ message: "Please enter a valid URL" }),
  type: z.enum(["http", "sse"]),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
});

type McpConnectorFormValues = z.infer<typeof mcpConnectorFormSchema>;

const HIDE_ADVANCED_SETTINGS = true;

export function McpConfigDialog({
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

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isEditing = connector !== null;

  const form = useForm<McpConnectorFormValues>({
    resolver: zodResolver(mcpConnectorFormSchema),
    defaultValues: {
      name: connector?.name ?? "",
      url: connector?.url ?? "",
      type: (connector?.type as "http" | "sse") ?? "http",
      oauthClientId: connector?.oauthClientId ?? "",
      oauthClientSecret: connector?.oauthClientSecret ?? "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      name: connector?.name ?? "",
      url: connector?.url ?? "",
      type: (connector?.type as "http" | "sse") ?? "http",
      oauthClientId: connector?.oauthClientId ?? "",
      oauthClientSecret: connector?.oauthClientSecret ?? "",
    });

    setAdvancedOpen(
      Boolean(connector?.oauthClientId || connector?.oauthClientSecret)
    );
  }, [open, connector, form]);

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

  const handleSubmit = (values: McpConnectorFormValues) => {
    const trimmed: McpConnectorFormValues = {
      ...values,
      name: values.name.trim(),
      url: values.url.trim(),
      oauthClientId: values.oauthClientId?.trim() || undefined,
      oauthClientSecret: values.oauthClientSecret?.trim() || undefined,
    };

    if (isEditing && connector) {
      updateConnector({
        id: connector.id,
        updates: {
          name: trimmed.name,
          url: trimmed.url,
          type: trimmed.type,
          oauthClientId: trimmed.oauthClientId ?? null,
          oauthClientSecret: trimmed.oauthClientSecret ?? null,
        },
      });
    } else {
      createConnector({
        name: trimmed.name,
        url: trimmed.url,
        type: trimmed.type,
        oauthClientId: trimmed.oauthClientId,
        oauthClientSecret: trimmed.oauthClientSecret,
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

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      maxLength={MCP_NAME_MAX_LENGTH}
                      placeholder="MCP Example"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://mcp-server.example.com/mcp"
                      type="url"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transport Type</FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="http">HTTP (Streamable)</SelectItem>
                        <SelectItem value="sse">
                          SSE (Server-Sent Events)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!HIDE_ADVANCED_SETTINGS && (
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
                  <FormField
                    control={form.control}
                    name="oauthClientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OAuth Client ID (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter client ID" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oauthClientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OAuth Client Secret (optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter client secret"
                            type="password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex gap-2">
                <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-500 text-sm">
                    Confirm that you trust this connector
                  </p>
                  <p className="text-muted-foreground text-xs">
                    This connector has not been verified. You are responsible
                    for all actions taken with this connector.
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
                {isPending && "Saving..."}
                {!isPending && (isEditing ? "Save" : "Add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
