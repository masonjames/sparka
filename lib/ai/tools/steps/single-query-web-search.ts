import { generateUUID } from "@/lib/utils";
import type { StreamWriter } from "../../types";
import {
  type SearchProviderOptions,
  type WebSearchResponse,
  webSearchStep,
} from "./web-search";

export async function singleQueryWebSearchStep({
  query,
  maxResults,
  providerOptions,
  dataStream,
  toolCallId,
}: {
  query: string;
  maxResults: number;
  dataStream: StreamWriter;
  providerOptions: SearchProviderOptions;
  toolCallId: string;
}): Promise<WebSearchResponse> {
  const updateId = generateUUID();
  try {
    // Send running status
    dataStream.write({
      type: "data-researchUpdate",
      id: updateId,
      data: {
        toolCallId,
        title: `Searching for "${query}"`,
        type: "web",
        status: "running",
        queries: [query],
      },
    });

    // Execute the search without annotations
    const result = await webSearchStep({
      query,
      maxResults,
      providerOptions,
      dataStream,
    });

    // Send completed status
    dataStream.write({
      type: "data-researchUpdate",
      id: updateId,
      data: {
        toolCallId,
        title: `Searching for "${query}"`,
        type: "web",
        status: "completed",
        queries: [query],
        results: result.results,
      },
    });

    return result;
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error occurred";

    // Send error status
    dataStream.write({
      type: "data-researchUpdate",
      id: updateId,
      data: {
        toolCallId,
        title: `Searching for "${query}"`,
        type: "web",
        status: "completed",
        queries: [query],
      },
    });

    return {
      results: [],
      error: errorMessage,
    };
  }
}
