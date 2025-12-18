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
import { Spinner } from "@/components/ui/spinner";
import { MCP_NAME_MAX_LENGTH } from "@/lib/ai/mcp-name-id";
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

export function McpCreateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const queryKey = trpc.mcp.list.queryKey();

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const form = useForm<McpConnectorFormValues>({
    resolver: zodResolver(mcpConnectorFormSchema),
    defaultValues: {
      name: "",
      url: "",
      type: "http",
      oauthClientId: "",
      oauthClientSecret: "",
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      name: "",
      url: "",
      type: "http",
      oauthClientId: "",
      oauthClientSecret: "",
    });

    setAdvancedOpen(false);
  }, [open, form]);

  const { mutateAsync: createConnector, isPending } = useMutation(
    trpc.mcp.create.mutationOptions({
      onError: (err) => {
        toast.error(err.message || "Failed to add connector");
      },
    })
  );

  const handleSubmit = async (values: McpConnectorFormValues) => {
    const trimmed: McpConnectorFormValues = {
      ...values,
      name: values.name.trim(),
      url: values.url.trim(),
      oauthClientId: values.oauthClientId?.trim() || undefined,
      oauthClientSecret: values.oauthClientSecret?.trim() || undefined,
    };

    await createConnector({
      name: trimmed.name,
      url: trimmed.url,
      type: trimmed.type,
      oauthClientId: trimmed.oauthClientId,
      oauthClientSecret: trimmed.oauthClientSecret,
    });
    toast.success("Connector added");
    queryClient.invalidateQueries({ queryKey });
    onClose();
  };

  return (
    <Dialog onOpenChange={(o) => !o && onClose()} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom connector</DialogTitle>
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
                {isPending && <Spinner />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
