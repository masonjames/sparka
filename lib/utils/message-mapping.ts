import type { ChatMessage } from "@/lib/ai/types";
import type { Part } from "@/lib/db/schema";

/**
 * Maps UI message parts to database Part rows
 * Each UI part becomes a single Part row with prefix-based columns populated
 */
export function mapUIMessagePartsToDBParts(
  parts: ChatMessage["parts"],
  messageId: string,
): Array<Omit<Part, "id" | "createdAt">> {
  return parts.map((part, index) => {
    const basePart = {
      messageId,
      order: index,
      type: part.type,
      providerMetadata:
        "providerMetadata" in part && part.providerMetadata
          ? part.providerMetadata
          : null,
    };

    switch (part.type) {
      case "text":
        return {
          ...basePart,
          text_text: part.text,
        };

      case "reasoning":
        return {
          ...basePart,
          reasoning_text: part.text,
        };

      case "file":
        return {
          ...basePart,
          file_mediaType: part.mediaType,
          file_filename: part.filename ?? null,
          file_url: part.url,
        };

      case "source-url":
        return {
          ...basePart,
          source_url_sourceId: part.sourceId,
          source_url_url: part.url,
          source_url_title: part.title ?? null,
        };

      case "source-document":
        return {
          ...basePart,
          source_document_sourceId: part.sourceId,
          source_document_mediaType: part.mediaType,
          source_document_title: part.title,
          source_document_filename: part.filename ?? null,
        };

      default:
        // Handle tool-* parts
        if (part.type.startsWith("tool-")) {
          const toolName = part.type.replace("tool-", "");
          return {
            ...basePart,
            tool_name: toolName,
            tool_toolCallId: part.toolCallId,
            tool_state: part.state,
            tool_input:
              part.state === "input-available" ||
              part.state === "output-available" ||
              part.state === "output-error" ||
              part.state === "input-streaming"
                ? part.input ?? null
                : null,
            tool_output:
              part.state === "output-available" ? part.output ?? null : null,
            tool_errorText:
              part.state === "output-error" ? part.errorText ?? null : null,
          };
        }

        // Handle data-* parts
        if (part.type.startsWith("data-")) {
          const dataType = part.type.replace("data-", "");
          return {
            ...basePart,
            data_type: dataType,
            data_blob: "data" in part ? part.data : part,
          };
        }

        // Unknown part type - store as generic data part
        return {
          ...basePart,
          data_type: part.type,
          data_blob: part,
        };
    }
  });
}

/**
 * Maps database Part rows back to UI message parts
 * Reconstructs the original ChatMessage parts array from Part rows
 */
export function mapDBPartsToUIParts(
  dbParts: Part[],
): ChatMessage["parts"] {
  return dbParts
    .sort((a, b) => a.order - b.order)
    .map((part) => {
      switch (part.type) {
        case "text":
          return {
            type: "text" as const,
            text: part.text_text!,
          };

        case "reasoning":
          return {
            type: "reasoning" as const,
            text: part.reasoning_text!,
            ...(part.providerMetadata
              ? { providerMetadata: part.providerMetadata }
              : {}),
          };

        case "file":
          return {
            type: "file" as const,
            mediaType: part.file_mediaType!,
            ...(part.file_filename ? { filename: part.file_filename } : {}),
            url: part.file_url!,
          };

        case "source-url":
          return {
            type: "source-url" as const,
            sourceId: part.source_url_sourceId!,
            url: part.source_url_url!,
            ...(part.source_url_title ? { title: part.source_url_title } : {}),
            ...(part.providerMetadata
              ? { providerMetadata: part.providerMetadata }
              : {}),
          };

        case "source-document":
          return {
            type: "source-document" as const,
            sourceId: part.source_document_sourceId!,
            mediaType: part.source_document_mediaType!,
            title: part.source_document_title!,
            ...(part.source_document_filename
              ? { filename: part.source_document_filename }
              : {}),
            ...(part.providerMetadata
              ? { providerMetadata: part.providerMetadata }
              : {}),
          };

        default:
          // Handle tool-* parts
          if (part.type.startsWith("tool-") && part.tool_name && part.tool_toolCallId && part.tool_state) {
            const toolPart: any = {
              type: part.type as `tool-${string}`,
              toolCallId: part.tool_toolCallId,
              state: part.tool_state as
                | "input-streaming"
                | "input-available"
                | "output-available"
                | "output-error",
            };

            if (
              part.tool_state === "input-available" ||
              part.tool_state === "output-available" ||
              part.tool_state === "output-error" ||
              part.tool_state === "input-streaming"
            ) {
              if (part.tool_input) {
                toolPart.input = part.tool_input;
              }
            }

            if (part.tool_state === "output-available" && part.tool_output) {
              toolPart.output = part.tool_output;
            }

            if (part.tool_state === "output-error" && part.tool_errorText) {
              toolPart.errorText = part.tool_errorText;
            }

            return toolPart;
          }

          // Handle data-* parts
          if (part.type.startsWith("data-") && part.data_type && part.data_blob) {
            return {
              type: part.type as `data-${string}`,
              data: part.data_blob,
            } as ChatMessage["parts"][number];
          }

          // Fallback: try to reconstruct from data_blob
          if (part.data_blob) {
            return part.data_blob as ChatMessage["parts"][number];
          }

          throw new Error(`Unsupported part type: ${part.type}`);
      }
    });
}

