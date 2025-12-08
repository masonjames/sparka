"use client";

import { useQuery } from "@tanstack/react-query";
import type { DynamicToolUIPart } from "ai";
import { WrenchIcon } from "lucide-react";
import { useMemo } from "react";
import { McpToolHeader } from "@/components/ai-elements/extra/mcp-tool-header";
import {
  Tool,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Favicon } from "@/components/favicon";
import { parseToolId } from "@/lib/ai/mcp-name-id";
import { useTRPC } from "@/trpc/react";
import { getGoogleFaviconUrl } from "../get-google-favicon-url";

type DynamicToolPartProps = {
  messageId: string;
  isReadonly: boolean;
  part: DynamicToolUIPart;
};

export function DynamicToolPart({ part }: DynamicToolPartProps) {
  const trpc = useTRPC();
  const { data: connectors } = useQuery(trpc.mcp.list.queryOptions());

  const iconUrl = useMemo(() => {
    const parsed = parseToolId(part.toolName);
    if (!(parsed && connectors)) {
      return;
    }

    const connector = connectors.find((c) => c.nameId === parsed.namespace);
    if (!connector) {
      return;
    }

    return getGoogleFaviconUrl(connector.url);
  }, [part.toolName, connectors]);

  const icon = iconUrl ? (
    <Favicon className="size-4 rounded-sm" url={iconUrl} />
  ) : (
    <WrenchIcon className="size-4 text-muted-foreground" />
  );

  return (
    <Tool defaultOpen={true}>
      <McpToolHeader
        icon={icon}
        state={part.state}
        title={part.title ?? part.toolName}
        type={`tool-${part.toolName}`}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput
          errorText={part.state === "output-error" ? part.errorText : undefined}
          output={part.state === "output-available" ? part.output : undefined}
        />
      </ToolContent>
    </Tool>
  );
}
