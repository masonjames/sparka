import type { ChatMessage } from "@/lib/ai/types";
import type { Part } from "@/lib/db/schema";
import { validateToolPart } from "./message-part-validators";

/**
 * Maps UI message parts to database Part rows
 * Each UI part becomes a single Part row with prefix-based columns populated
 */
export function mapUIMessagePartsToDBParts(
  parts: ChatMessage["parts"],
  messageId: string,
): Array<Omit<Part, "id" | "createdAt">> {
  return parts
    .map((part, index) => {
      // Base object with all nullable fields set to null
      const basePart: Omit<Part, "id" | "createdAt"> = {
        messageId,
        order: index,
        type: part.type,
        text_text: null,
        reasoning_text: null,
        file_mediaType: null,
        file_filename: null,
        file_url: null,
        source_url_sourceId: null,
        source_url_url: null,
        source_url_title: null,
        source_document_sourceId: null,
        source_document_mediaType: null,
        source_document_title: null,
        source_document_filename: null,
        tool_name: null,
        tool_toolCallId: null,
        tool_state: null,
        tool_input: null,
        tool_output: null,
        tool_errorText: null,
        data_type: null,
        data_blob: null,
        providerMetadata: null,
      };

      if ("providerMetadata" in part && part.providerMetadata) {
        basePart.providerMetadata = part.providerMetadata;
      }

      switch (part.type) {
        case "text":
          basePart.text_text = part.text;
          return basePart;

        case "reasoning":
          basePart.reasoning_text = part.text;
          return basePart;

        case "file":
          basePart.file_mediaType = part.mediaType;
          basePart.file_filename = part.filename ?? null;
          basePart.file_url = part.url;
          return basePart;

        case "source-url":
          basePart.source_url_sourceId = part.sourceId;
          basePart.source_url_url = part.url;
          basePart.source_url_title = part.title ?? null;
          return basePart;

        case "source-document":
          basePart.source_document_sourceId = part.sourceId;
          basePart.source_document_mediaType = part.mediaType;
          basePart.source_document_title = part.title;
          basePart.source_document_filename = part.filename ?? null;
          return basePart;

        case "step-start":
          // Save step-start parts (they're markers but should be persisted)
          return basePart;

        default:
          // Skip old "tool-invocation" format (runtime check for legacy data)
          // Using type assertion because this is legacy data that may not be in types
          if ((part as { type: string }).type === "tool-invocation") {
            return null;
          }

          // Handle tool-* parts with validation
          if (part.type.startsWith("tool-")) {
            const validationResult = validateToolPart(part);

            // Skip invalid tool parts
            if (!validationResult.success) {
              return null;
            }

            const toolPart = validationResult.data;
            const toolName = toolPart.type.replace("tool-", "");
            basePart.tool_name = toolName;
            basePart.tool_toolCallId = toolPart.toolCallId;
            basePart.tool_state = toolPart.state;

            if (
              toolPart.state === "input-available" ||
              toolPart.state === "output-available" ||
              toolPart.state === "output-error" ||
              toolPart.state === "input-streaming"
            ) {
              basePart.tool_input = toolPart.input ?? null;
            }

            if (toolPart.state === "output-available") {
              basePart.tool_output = toolPart.output ?? null;
            }

            if (toolPart.state === "output-error") {
              basePart.tool_errorText = toolPart.errorText ?? null;
            }

            return basePart;
          }

          // Handle data-* parts
          if (part.type.startsWith("data-")) {
            const dataType = part.type.replace("data-", "");
            basePart.data_type = dataType;
            basePart.data_blob = "data" in part ? part.data : part;
            return basePart;
          }

          // Unknown part type - store as generic data part
          basePart.data_type = part.type;
          basePart.data_blob = part;
          return basePart;
      }
    })
    .filter((part): part is Omit<Part, "id" | "createdAt"> => part !== null);
}

/**
 * Maps database Part rows back to UI message parts
 * Reconstructs the original ChatMessage parts array from Part rows
 */
export function mapDBPartsToUIParts(
  dbParts: Part[],
): ChatMessage["parts"] {
  const parts = dbParts
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

        case "step-start":
          return {
            type: "step-start" as const,
          };

        default:
          // Handle tool-* parts generically
          if (part.type.startsWith("tool-")) {
            if (!part.tool_toolCallId || !part.tool_state) {
              // Skip if missing required fields (handles old tool-invocation format)
              return null;
            }

            // Switch on the 4 known states
            switch (part.tool_state) {
              case "input-streaming":
                return {
                  type: part.type as `tool-${string}`,
                  toolCallId: part.tool_toolCallId,
                  state: "input-streaming" as const,
                  ...(part.tool_input !== null && part.tool_input !== undefined
                    ? { input: part.tool_input }
                    : {}),
                } as ChatMessage["parts"][number];

              case "input-available":
                return {
                  type: part.type as `tool-${string}`,
                  toolCallId: part.tool_toolCallId,
                  state: "input-available" as const,
                  input: part.tool_input!,
                  ...(part.providerMetadata
                    ? { callProviderMetadata: part.providerMetadata }
                    : {}),
                } as ChatMessage["parts"][number];

              case "output-available":
                return {
                  type: part.type as `tool-${string}`,
                  toolCallId: part.tool_toolCallId,
                  state: "output-available" as const,
                  input: part.tool_input!,
                  output: part.tool_output!,
                  ...(part.providerMetadata
                    ? { callProviderMetadata: part.providerMetadata }
                    : {}),
                } as ChatMessage["parts"][number];

              case "output-error":
                return {
                  type: part.type as `tool-${string}`,
                  toolCallId: part.tool_toolCallId,
                  state: "output-error" as const,
                  input: part.tool_input!,
                  errorText: part.tool_errorText!,
                  ...(part.providerMetadata
                    ? { callProviderMetadata: part.providerMetadata }
                    : {}),
                } as ChatMessage["parts"][number];

              default:
                // Skip unknown states (handles old tool-invocation format)
                return null;
            }
          }

          // Handle data-* parts generically
          if (part.type.startsWith("data-")) {
            if (part.data_type && part.data_blob) {
              return {
                type: part.type as `data-${string}`,
                data: part.data_blob,
              } as ChatMessage["parts"][number];
            }
            // Fallback: try to reconstruct from data_blob
            if (part.data_blob) {
              return part.data_blob as ChatMessage["parts"][number];
            }
          }

          throw new Error(`Unsupported part type: ${part.type}`);
      }
    });

  // Filter out null values (invalid tool parts that failed validation)
  return parts.filter(
    (part): part is ChatMessage["parts"][number] => part !== null
  );
}

