import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
} from "ai";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import {
  type AppModelDefinition,
  type AppModelId,
  getAppModelDefinition,
} from "@/lib/ai/app-models";
import { createCoreChatAgent } from "@/lib/ai/core-chat-agent";
import { determineExplicitlyRequestedTools } from "@/lib/ai/determine-explicitly-requested-tools";
import { ChatSDKError } from "@/lib/ai/errors";
import {
  generateFollowupSuggestions,
  streamFollowupSuggestions,
} from "@/lib/ai/followup-suggestions";
import { systemPrompt } from "@/lib/ai/prompts";
import { calculateMessagesTokens } from "@/lib/ai/token-utils";
import { allTools, toolsDefinitions } from "@/lib/ai/tools/tools-definitions";
import type { ChatMessage, ToolName } from "@/lib/ai/types";
import {
  getAnonymousSession,
  setAnonymousSession,
} from "@/lib/anonymous-session-server";
import { auth } from "@/lib/auth";
import { siteConfig } from "@/lib/config";
import { createAnonymousSession } from "@/lib/create-anonymous-session";
import { calculateLLMCostFromModel } from "@/lib/credits/cost-utils";
import { getMcpConnectorsByUserId } from "@/lib/db/mcp-queries";
import {
  getChatById,
  getMessageById,
  getProjectById,
  getUserById,
  saveChat,
  saveMessage,
  updateMessage,
} from "@/lib/db/queries";
import type { McpConnector } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { MAX_INPUT_TOKENS } from "@/lib/limits/tokens";
import { createModuleLogger } from "@/lib/logger";
import { canSpend, deductCredits } from "@/lib/repositories/credits";
import type { AnonymousSession } from "@/lib/types/anonymous";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";
import { generateUUID } from "@/lib/utils";
import { checkAnonymousRateLimit, getClientIP } from "@/lib/utils/rate-limit";
import { generateTitleFromUserMessage } from "../../actions";
import { getThreadUpToMessageId } from "./get-thread-up-to-message-id";

// Create shared Redis clients for resumable stream and cleanup
let redisPublisher: any = null;
let redisSubscriber: any = null;

if (env.REDIS_URL) {
  (async () => {
    const redis = await import("redis");
    redisPublisher = redis.createClient({ url: env.REDIS_URL });
    redisSubscriber = redis.createClient({ url: env.REDIS_URL });
    await Promise.all([redisPublisher.connect(), redisSubscriber.connect()]);
  })();
}

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: "sparka-ai:resumable-stream",
        ...(redisPublisher && redisSubscriber
          ? {
              publisher: redisPublisher,
              subscriber: redisSubscriber,
            }
          : {}),
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

async function handleAnonymousSession({
  request,
  redis,
  selectedModelId,
}: {
  request: NextRequest;
  redis: any;
  selectedModelId: AppModelId;
}): Promise<{
  anonymousSession: AnonymousSession;
  error: Response | null;
}> {
  const log = createModuleLogger("api:chat:anonymous");

  // Apply rate limiting for anonymous users
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkAnonymousRateLimit(clientIP, redis);

  if (!rateLimitResult.success) {
    log.warn({ clientIP }, "Rate limit exceeded");
    return {
      anonymousSession: null as any,
      error: new Response(
        JSON.stringify({
          error: rateLimitResult.error,
          type: "RATE_LIMIT_EXCEEDED",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...(rateLimitResult.headers || {}),
          },
        }
      ),
    };
  }

  let anonymousSession = await getAnonymousSession();
  if (!anonymousSession) {
    anonymousSession = await createAnonymousSession();
  }

  // Check credit limits
  if (anonymousSession.remainingCredits <= 0) {
    log.info("Anonymous credit limit reached");
    return {
      anonymousSession: null as any,
      error: new Response(
        JSON.stringify({
          error: "You've used your free credits. Sign up to continue chatting!",
          type: "ANONYMOUS_LIMIT_EXCEEDED",
          suggestion:
            "Create an account to get more credits and access to more AI models",
        }),
        {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            ...(rateLimitResult.headers || {}),
          },
        }
      ),
    };
  }

  // Validate model for anonymous users
  if (!ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(selectedModelId as any)) {
    log.warn("Model not available for anonymous users");
    return {
      anonymousSession: null as any,
      error: new Response(
        JSON.stringify({
          error: "Model not available for anonymous users",
          availableModels: ANONYMOUS_LIMITS.AVAILABLE_MODELS,
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...(rateLimitResult.headers || {}),
          },
        }
      ),
    };
  }

  return { anonymousSession, error: null };
}

async function handleChatValidation({
  chatId,
  userId,
  userMessage,
  projectId,
}: {
  chatId: string;
  userId: string;
  userMessage: ChatMessage;
  projectId?: string;
}): Promise<Response | null> {
  const log = createModuleLogger("api:chat:validation");

  const chat = await getChatById({ id: chatId });

  if (chat) {
    if (chat.userId !== userId) {
      log.warn("Unauthorized - chat ownership mismatch");
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    const title = await generateTitleFromUserMessage({
      message: userMessage,
    });

    await saveChat({ id: chatId, userId, title, projectId });
  }

  const [existentMessage] = await getMessageById({ id: userMessage.id });

  if (existentMessage && existentMessage.chatId !== chatId) {
    log.warn("Unauthorized - message chatId mismatch");
    return new Response("Unauthorized", { status: 401 });
  }

  if (!existentMessage) {
    // If the message does not exist, save it
    await saveMessage({
      id: userMessage.id,
      chatId,
      message: userMessage,
    });
  }

  return null;
}

async function checkUserCanSpend({
  userId,
  isAnonymous,
  anonymousSession,
}: {
  userId: string | null;
  isAnonymous: boolean;
  anonymousSession: AnonymousSession | null;
}): Promise<{ error: Response | null }> {
  if (!isAnonymous) {
    if (!userId) {
      return {
        error: new Response("User ID is required for authenticated users", {
          status: 401,
        }),
      };
    }

    const userCanSpend = await canSpend(userId);
    if (!userCanSpend) {
      return {
        error: new Response("Insufficient credits", { status: 402 }),
      };
    }

    return { error: null };
  }

  // Check anonymous session credits
  if (anonymousSession && anonymousSession.remainingCredits <= 0) {
    return {
      error: new Response("Anonymous credits exhausted", { status: 402 }),
    };
  }

  return { error: null };
}

/**
 * Determines which built-in tools are allowed based on model capabilities.
 * MCP tools are handled separately in core-chat-agent.
 */
function determineAllowedTools({
  isAnonymous,
  modelDefinition,
  explicitlyRequestedTools,
}: {
  isAnonymous: boolean;
  modelDefinition: AppModelDefinition;
  explicitlyRequestedTools: ToolName[] | null;
}): ToolName[] {
  // Start with all tools or anonymous-limited tools
  let allowedTools: ToolName[] = isAnonymous
    ? [...ANONYMOUS_LIMITS.AVAILABLE_TOOLS]
    : [...allTools];

  // Disable all tools for models with unspecified features
  if (!modelDefinition?.input) {
    return [];
  }

  // Don't allow deepResearch if the model supports reasoning (expensive and slow)
  if (modelDefinition.reasoning) {
    allowedTools = allowedTools.filter((tool) => tool !== "deepResearch");
  }

  // If specific tools were requested, filter them against allowed tools
  if (explicitlyRequestedTools && explicitlyRequestedTools.length > 0) {
    return explicitlyRequestedTools.filter((tool) =>
      allowedTools.includes(tool)
    );
  }

  return allowedTools;
}

async function getSystemPrompt({
  isAnonymous,
  chatId,
}: {
  isAnonymous: boolean;
  chatId: string;
}): Promise<string> {
  let system = systemPrompt();
  if (!isAnonymous) {
    const currentChat = await getChatById({ id: chatId });
    if (currentChat?.projectId) {
      const project = await getProjectById({ id: currentChat.projectId });
      if (project?.instructions) {
        system = `${system}\n\nProject instructions:\n${project.instructions}`;
      }
    }
  }
  return system;
}

async function createChatStream({
  messageId,
  chatId,
  userMessage,
  previousMessages,
  selectedModelId,
  modelDefinition,
  selectedTool,
  userId,
  allowedTools,
  abortController,
  isAnonymous,
  timeoutId,
  mcpConnectors,
  streamId,
}: {
  messageId: string;
  chatId: string;
  userMessage: ChatMessage;
  previousMessages: ChatMessage[];
  selectedModelId: AppModelId;
  modelDefinition: AppModelDefinition;
  selectedTool: string | null;
  userId: string | null;
  allowedTools: ToolName[];
  abortController: AbortController;
  isAnonymous: boolean;
  timeoutId: NodeJS.Timeout;
  mcpConnectors: McpConnector[];
  streamId: string;
}) {
  const log = createModuleLogger("api:chat:stream");
  const system = await getSystemPrompt({ isAnonymous, chatId });

  const narrowedSelectedTool: ToolName | null =
    selectedTool && selectedTool in toolsDefinitions
      ? (selectedTool as ToolName)
      : null;

  // Store usage for cost calculation
  let finalUsage: { inputTokens?: number; outputTokens?: number } | undefined;

  // Build the data stream that will emit tokens
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      // Confirm chat persistence ASAP (chat + user message are persisted before streaming begins)
      if (!isAnonymous) {
        dataStream.write({
          id: generateUUID(),
          type: "data-chatConfirmed",
          data: { chatId },
          transient: true,
        });
      }

      const { result, contextForLLM } = await createCoreChatAgent({
        system,
        userMessage,
        previousMessages,
        selectedModelId,
        selectedTool: narrowedSelectedTool,
        userId,
        budgetAllowedTools: allowedTools,
        abortSignal: abortController.signal,
        messageId,
        dataStream,
        onError: (error) => {
          log.error({ error }, "streamText error");
        },
        mcpConnectors,
      });

      const initialMetadata: ChatMessage["metadata"] = {
        createdAt: new Date(),
        parentMessageId: userMessage.id,
        selectedModel: selectedModelId,
        activeStreamId: isAnonymous ? null : streamId,
      };

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            // send custom information to the client on start:
            if (part.type === "start") {
              return initialMetadata;
            }

            // when the message is finished, send additional information:
            if (part.type === "finish") {
              // Capture usage for cost calculation
              finalUsage = part.totalUsage;
              return {
                ...initialMetadata,
                usage: part.totalUsage,
                activeStreamId: null,
              };
            }
          },
        })
      );
      await result.consumeStream();

      const response = await result.response;
      const responseMessages = response.messages;

      // Generate and stream follow-up suggestions
      const followupSuggestionsResult = generateFollowupSuggestions([
        ...contextForLLM,
        ...responseMessages,
      ]);
      await streamFollowupSuggestions({
        followupSuggestionsResult,
        writer: dataStream,
      });
    },
    generateId: () => messageId,
    onFinish: async ({ messages }) => {
      clearTimeout(timeoutId);
      await finalizeMessageAndCredits({
        messages,
        userId,
        isAnonymous,
        chatId,
        modelDefinition,
        usage: finalUsage ?? {},
      });
    },
    onError: () => {
      clearTimeout(timeoutId);
      // TODO: Verify if we need to clear activeStreamId immediately when stream finishes
      log.error("onError");
      return "Oops, an error occured!";
    },
  });

  return stream;
}

async function executeChatRequest({
  chatId,
  userMessage,
  previousMessages,
  selectedModelId,
  modelDefinition,
  selectedTool,
  userId,
  isAnonymous,
  allowedTools,
  abortController,
  timeoutId,
  mcpConnectors,
}: {
  chatId: string;
  userMessage: ChatMessage;
  previousMessages: ChatMessage[];
  selectedModelId: AppModelId;
  modelDefinition: AppModelDefinition;
  selectedTool: string | null;
  userId: string | null;
  isAnonymous: boolean;
  allowedTools: ToolName[];
  abortController: AbortController;
  timeoutId: NodeJS.Timeout;
  mcpConnectors: McpConnector[];
}): Promise<Response> {
  const log = createModuleLogger("api:chat:execute");
  const messageId = generateUUID();
  const streamId = generateUUID();

  if (!isAnonymous) {
    // Save placeholder assistant message immediately (needed for document creation)
    await saveMessage({
      id: messageId,
      chatId,
      message: {
        id: messageId,
        role: "assistant",
        parts: [],
        metadata: {
          createdAt: new Date(),
          parentMessageId: userMessage.id,
          selectedModel: selectedModelId,
          selectedTool: undefined,
          activeStreamId: streamId,
        },
      },
    });
  }

  // Build the data stream that will emit tokens
  const stream = await createChatStream({
    messageId,
    chatId,
    userMessage,
    previousMessages,
    selectedModelId,
    modelDefinition,
    selectedTool,
    userId,
    allowedTools,
    abortController,
    isAnonymous,
    timeoutId,
    mcpConnectors,
    streamId,
  });

  after(async () => {
    // Set TTL on resumable-stream library's internal Redis keys
    if (redisPublisher) {
      try {
        const keyPattern = `sparka-ai:resumable-stream:rs:sentinel:${streamId}*`;
        const keys = await redisPublisher.keys(keyPattern);
        if (keys.length > 0) {
          await Promise.all(
            keys.map((key: string) => redisPublisher.expire(key, 300))
          );
        }
      } catch (error) {
        log.error({ error }, "Failed to set TTL on stream keys");
      }
    }
  });

  const streamContext = getStreamContext();

  if (streamContext) {
    log.debug("Returning resumable stream");
    return new Response(
      await streamContext.resumableStream(streamId, () =>
        stream.pipeThrough(new JsonToSseTransformStream())
      ),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function validateAndSetupSession({
  request,
  userMessage,
  selectedModelId,
}: {
  request: NextRequest;
  userMessage: ChatMessage;
  selectedModelId: AppModelId;
}): Promise<{
  userId: string | null;
  isAnonymous: boolean;
  anonymousSession: AnonymousSession | null;
  modelDefinition: AppModelDefinition;
  error: Response | null;
}> {
  const log = createModuleLogger("api:chat:setup");

  const session = await auth.api.getSession({ headers: await headers() });

  const userId = session?.user?.id || null;
  const isAnonymous = userId === null;
  let anonymousSession: AnonymousSession | null = null;

  // Check for authenticated users
  if (userId) {
    // TODO: Consider if checking if user exists is really needed
    const user = await getUserById({ userId });
    if (!user) {
      log.warn("User not found");
      return {
        userId: null,
        isAnonymous: true,
        anonymousSession: null,
        modelDefinition: null as any,
        error: new Response("User not found", { status: 404 }),
      };
    }
  } else {
    const result = await handleAnonymousSession({
      request,
      redis: redisPublisher,
      selectedModelId,
    });

    if (result.error) {
      return {
        userId: null,
        isAnonymous: true,
        anonymousSession: null,
        modelDefinition: null as any,
        error: result.error,
      };
    }

    anonymousSession = result.anonymousSession;
  }

  // Extract selectedTool from user message metadata
  const selectedTool = userMessage.metadata.selectedTool || null;
  log.debug({ selectedTool }, "selectedTool");

  let modelDefinition: AppModelDefinition;
  try {
    modelDefinition = await getAppModelDefinition(selectedModelId);
  } catch (_error) {
    log.warn("Model not found");
    return {
      userId,
      isAnonymous,
      anonymousSession,
      modelDefinition: null as any,
      error: new Response("Model not found", { status: 404 }),
    };
  }

  return {
    userId,
    isAnonymous,
    anonymousSession,
    modelDefinition,
    error: null,
  };
}

async function prepareRequestContext({
  userMessage,
  chatId,
  isAnonymous,
  anonymousPreviousMessages,
  modelDefinition,
  explicitlyRequestedTools,
}: {
  userMessage: ChatMessage;
  chatId: string;
  isAnonymous: boolean;
  anonymousPreviousMessages: ChatMessage[];
  modelDefinition: AppModelDefinition;
  explicitlyRequestedTools: ToolName[] | null;
}): Promise<{
  previousMessages: ChatMessage[];
  allowedTools: ToolName[];
  error: Response | null;
}> {
  const log = createModuleLogger("api:chat:prepare");

  const allowedTools = determineAllowedTools({
    isAnonymous,
    modelDefinition,
    explicitlyRequestedTools,
  });

  // Validate input token limit (50k tokens for user message)
  const totalTokens = calculateMessagesTokens(
    await convertToModelMessages([userMessage])
  );

  if (totalTokens > MAX_INPUT_TOKENS) {
    log.warn({ totalTokens, MAX_INPUT_TOKENS }, "Token limit exceeded");
    const error = new ChatSDKError(
      "input_too_long:chat",
      `Message too long: ${totalTokens} tokens (max: ${MAX_INPUT_TOKENS})`
    );
    return {
      previousMessages: [],
      allowedTools: [],
      error: error.toResponse(),
    };
  }

  const messageThreadToParent = isAnonymous
    ? anonymousPreviousMessages
    : await getThreadUpToMessageId(
        chatId,
        userMessage.metadata.parentMessageId
      );

  const previousMessages = messageThreadToParent.slice(-5);
  log.debug({ allowedTools }, "allowed tools");

  return { previousMessages, allowedTools, error: null };
}

async function finalizeMessageAndCredits({
  messages,
  userId,
  isAnonymous,
  chatId,
  modelDefinition,
  usage,
}: {
  messages: ChatMessage[];
  userId: string | null;
  isAnonymous: boolean;
  chatId: string;
  modelDefinition: AppModelDefinition;
  usage: { inputTokens?: number; outputTokens?: number };
}): Promise<void> {
  const log = createModuleLogger("api:chat:finalize");

  try {
    const assistantMessage = messages.at(-1);

    if (!assistantMessage) {
      throw new Error("No assistant message found!");
    }

    if (!isAnonymous) {
      await updateMessage({
        id: assistantMessage.id,
        chatId,
        message: {
          ...assistantMessage,
          metadata: {
            ...assistantMessage.metadata,
            activeStreamId: null,
          },
        },
      });
    }

    // Calculate cost from actual token usage
    const llmCost = usage
      ? calculateLLMCostFromModel(usage, modelDefinition)
      : 0;

    // Calculate tool costs (external API fees)
    const toolCost = messages
      .flatMap((message) => message.parts)
      .reduce((acc, part) => {
        if (!part.type.startsWith("tool-")) {
          return acc;
        }
        const toolName = part.type.replace("tool-", "") as ToolName;
        const toolDef = toolsDefinitions[toolName];
        return acc + (toolDef?.cost ?? 0);
      }, 0);

    const totalCost = llmCost + toolCost;

    // Deduct credits for authenticated users
    if (userId && !isAnonymous) {
      log.debug({ llmCost, toolCost, totalCost }, "Deducting credits");
      await deductCredits(userId, totalCost);
    }

    // Note: Anonymous credits are pre-deducted before streaming starts (cookies can't be set after response begins)
  } catch (error) {
    log.error({ error }, "Failed to save chat or finalize credits");
  }
}

async function handleRequestExecution({
  chatId,
  userMessage,
  previousMessages,
  selectedModelId,
  modelDefinition,
  selectedTool,
  userId,
  isAnonymous,
  allowedTools,
  abortController,
  timeoutId,
  mcpConnectors,
}: {
  chatId: string;
  userMessage: ChatMessage;
  previousMessages: ChatMessage[];
  selectedModelId: AppModelId;
  modelDefinition: AppModelDefinition;
  selectedTool: string | null;
  userId: string | null;
  isAnonymous: boolean;
  allowedTools: ToolName[];
  abortController: AbortController;
  timeoutId: NodeJS.Timeout;
  mcpConnectors: McpConnector[];
}): Promise<Response> {
  const log = createModuleLogger("api:chat:execute-wrapper");
  try {
    return await executeChatRequest({
      chatId,
      userMessage,
      previousMessages,
      selectedModelId,
      modelDefinition,
      selectedTool,
      userId,
      isAnonymous,
      allowedTools,
      abortController,
      timeoutId,
      mcpConnectors,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    log.error({ error }, "error found in try block");
    throw error;
  }
}

const ANONYMOUS_COST_PER_MESSAGE = 1;

async function preDeductAnonymousCredits(
  isAnonymous: boolean,
  anonymousSession: AnonymousSession | null
) {
  if (isAnonymous && anonymousSession) {
    await setAnonymousSession({
      ...anonymousSession,
      remainingCredits:
        anonymousSession.remainingCredits - ANONYMOUS_COST_PER_MESSAGE,
    });
  }
}

export async function POST(request: NextRequest) {
  const log = createModuleLogger("api:chat");
  try {
    const {
      id: chatId,
      message: userMessage,
      prevMessages: anonymousPreviousMessages,
      projectId,
    }: {
      id: string;
      message: ChatMessage;
      prevMessages: ChatMessage[];
      projectId?: string;
    } = await request.json();

    if (!userMessage) {
      log.warn("No user message found");
      return new ChatSDKError("bad_request:api").toResponse();
    }

    // Extract selectedModel from user message metadata
    const selectedModelId = userMessage.metadata?.selectedModel as AppModelId;

    if (!selectedModelId) {
      log.warn("No selectedModel in user message metadata");
      return new ChatSDKError("bad_request:api").toResponse();
    }

    const sessionSetup = await validateAndSetupSession({
      request,
      userMessage,
      selectedModelId,
    });

    if (sessionSetup.error) {
      return sessionSetup.error;
    }

    const { userId, isAnonymous, anonymousSession, modelDefinition } =
      sessionSetup;

    // Extract selectedTool from user message metadata
    const selectedTool = userMessage.metadata.selectedTool || null;
    // Skip database operations for anonymous users
    if (!isAnonymous) {
      if (!userId) {
        log.warn("User ID is required for authenticated users");
        return new Response("User ID is required for authenticated users", {
          status: 401,
        });
      }

      const validationError = await handleChatValidation({
        chatId,
        userId,
        userMessage,
        projectId,
      });

      if (validationError) {
        return validationError;
      }
    }

    const explicitlyRequestedTools =
      determineExplicitlyRequestedTools(selectedTool);

    // Check if user can spend (has positive credits)
    const creditCheck = await checkUserCanSpend({
      userId,
      isAnonymous,
      anonymousSession,
    });

    if (creditCheck.error) {
      return creditCheck.error;
    }

    // Pre-deduct credits for anonymous users (cookies must be set before streaming)
    await preDeductAnonymousCredits(isAnonymous, anonymousSession);

    const contextResult = await prepareRequestContext({
      userMessage,
      chatId,
      isAnonymous,
      anonymousPreviousMessages,
      modelDefinition,
      explicitlyRequestedTools,
    });

    if (contextResult.error) {
      return contextResult.error;
    }

    const { previousMessages, allowedTools } = contextResult;

    // Fetch MCP connectors for authenticated users (only if MCP integration enabled)
    const mcpConnectors: McpConnector[] =
      siteConfig.integrations.mcp && userId && !isAnonymous
        ? await getMcpConnectorsByUserId({ userId })
        : [];

    // Create AbortController with timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 290_000); // 290 seconds

    return await handleRequestExecution({
      chatId,
      userMessage,
      previousMessages,
      selectedModelId,
      modelDefinition,
      selectedTool,
      userId,
      isAnonymous,
      allowedTools,
      abortController,
      timeoutId,
      mcpConnectors,
    });
  } catch (error) {
    log.error({ error }, "RESPONSE > POST /api/chat error");
    return new Response("Internal Server Error", {
      status: 500,
    });
  }
}

// DELETE moved to tRPC chat.deleteChat mutation
