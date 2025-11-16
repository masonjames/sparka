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
import { createAnonymousSession } from "@/lib/create-anonymous-session";
import type { CreditReservation } from "@/lib/credits/credit-reservation";
import {
  filterAffordableTools,
  getBaseModelCostByModelId,
} from "@/lib/credits/credits-utils";
import {
  getChatById,
  getMessageById,
  getProjectById,
  getUserById,
  saveChat,
  saveMessage,
  updateMessage,
} from "@/lib/db/queries";
import { env } from "@/lib/env";
import { MAX_INPUT_TOKENS } from "@/lib/limits/tokens";
import { createModuleLogger } from "@/lib/logger";
import type { AnonymousSession } from "@/lib/types/anonymous";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";
import { generateUUID } from "@/lib/utils";
import { checkAnonymousRateLimit, getClientIP } from "@/lib/utils/rate-limit";
import { generateTitleFromUserMessage } from "../../actions";
import { getCreditReservation } from "./get-credit-reservation";
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

export function getRedisSubscriber() {
  return redisSubscriber;
}

export function getRedisPublisher() {
  return redisPublisher;
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

    const session = await auth.api.getSession({ headers: await headers() });

    const userId = session?.user?.id || null;
    const isAnonymous = userId === null;
    let anonymousSession: AnonymousSession | null = null;

    // Check for anonymous users

    if (userId) {
      // TODO: Consider if checking if user exists is really needed
      const user = await getUserById({ userId });
      if (!user) {
        log.warn("User not found");
        return new Response("User not found", { status: 404 });
      }
    } else {
      // Apply rate limiting for anonymous users
      const clientIP = getClientIP(request);
      const rateLimitResult = await checkAnonymousRateLimit(
        clientIP,
        redisPublisher
      );

      if (!rateLimitResult.success) {
        log.warn({ clientIP }, "Rate limit exceeded");
        return new Response(
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
        );
      }

      anonymousSession = await getAnonymousSession();
      if (!anonymousSession) {
        anonymousSession = await createAnonymousSession();
      }

      // Check message limits
      if (anonymousSession.remainingCredits <= 0) {
        log.info("Anonymous message limit reached");
        return new Response(
          JSON.stringify({
            error: `You've used all ${ANONYMOUS_LIMITS.CREDITS} free messages. Sign up to continue chatting with unlimited access!`,
            type: "ANONYMOUS_LIMIT_EXCEEDED",
            maxMessages: ANONYMOUS_LIMITS.CREDITS,
            suggestion:
              "Create an account to get unlimited messages and access to more AI models",
          }),
          {
            status: 402,
            headers: {
              "Content-Type": "application/json",
              ...(rateLimitResult.headers || {}),
            },
          }
        );
      }

      // Validate model for anonymous users
      if (!ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(selectedModelId as any)) {
        log.warn("Model not available for anonymous users");
        return new Response(
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
        );
      }
    }

    // Extract selectedTool from user message metadata
    const selectedTool = userMessage.metadata.selectedTool || null;
    log.debug({ selectedTool }, "selectedTool");
    let modelDefinition: AppModelDefinition;
    try {
      modelDefinition = getAppModelDefinition(selectedModelId);
    } catch (_error) {
      log.warn("Model not found");
      return new Response("Model not found", { status: 404 });
    }
    // Skip database operations for anonymous users
    if (!isAnonymous) {
      const chat = await getChatById({ id: chatId });

      if (chat && chat.userId !== userId) {
        log.warn("Unauthorized - chat ownership mismatch");
        return new Response("Unauthorized", { status: 401 });
      }

      if (chat) {
        if (chat.userId !== userId) {
          log.warn("Unauthorized - chat ownership mismatch");
          return new Response("Unauthorized", { status: 401 });
        }
      } else {
        // First time chat is created, generate a title
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });

        await saveChat({ id: chatId, userId, title, projectId });
      }

      const [exsistentMessage] = await getMessageById({ id: userMessage.id });

      if (exsistentMessage && exsistentMessage.chatId !== chatId) {
        log.warn("Unauthorized - message chatId mismatch");
        return new Response("Unauthorized", { status: 401 });
      }

      if (!exsistentMessage) {
        // If the message does not exist, save it
        await saveMessage({
          id: userMessage.id,
          chatId,
          message: userMessage,
        });
      }
    }

    let explicitlyRequestedTools: ToolName[] | null = null;
    if (selectedTool === "deepResearch") {
      explicitlyRequestedTools = ["deepResearch"];
    }
    // else if (selectedTool === 'reason') explicitlyRequestedTool = 'reasonSearch';
    else if (selectedTool === "webSearch") {
      explicitlyRequestedTools = ["webSearch"];
    } else if (selectedTool === "generateImage") {
      explicitlyRequestedTools = ["generateImage"];
    } else if (selectedTool === "createDocument") {
      explicitlyRequestedTools = ["createDocument", "updateDocument"];
    }

    const baseModelCost = getBaseModelCostByModelId(selectedModelId);

    let reservation: CreditReservation | null = null;

    if (!isAnonymous) {
      const { reservation: res, error: creditError } =
        await getCreditReservation(userId, baseModelCost);

      if (creditError) {
        console.log(
          "RESPONSE > POST /api/chat: Credit reservation error:",
          creditError
        );
        return new Response(creditError, {
          status: 402,
        });
      }

      reservation = res;
    } else if (anonymousSession) {
      // Increment message count and update session
      anonymousSession.remainingCredits -= baseModelCost;
      await setAnonymousSession(anonymousSession);
    }

    let activeTools: ToolName[] = filterAffordableTools(
      isAnonymous ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS : allTools,
      isAnonymous
        ? ANONYMOUS_LIMITS.CREDITS
        : reservation
          ? reservation.budget - baseModelCost
          : 0
    );

    // Disable all tools for models with unspecified features
    if (modelDefinition?.input) {
      // Let's not allow deepResearch if the model support reasoning (it's expensive and slow)
      if (
        modelDefinition.reasoning &&
        activeTools.some((tool: ToolName) => tool === "deepResearch")
      ) {
        activeTools = activeTools.filter(
          (tool: ToolName) => tool !== "deepResearch"
        );
      }
    } else {
      activeTools = [];
    }

    if (
      explicitlyRequestedTools &&
      explicitlyRequestedTools.length > 0 &&
      !activeTools.some((tool: ToolName) =>
        explicitlyRequestedTools.includes(tool)
      )
    ) {
      log.warn(
        { explicitlyRequestedTools },
        "Insufficient budget for requested tool"
      );
      return new Response(
        `Insufficient budget for requested tool: ${explicitlyRequestedTools}.`,
        {
          status: 402,
        }
      );
    }
    if (explicitlyRequestedTools && explicitlyRequestedTools.length > 0) {
      log.debug(
        { explicitlyRequestedTools },
        "Setting explicitly requested tools"
      );
      activeTools = explicitlyRequestedTools;
    }

    // Validate input token limit (50k tokens for user message)
    const totalTokens = calculateMessagesTokens(
      convertToModelMessages([userMessage])
    );

    if (totalTokens > MAX_INPUT_TOKENS) {
      log.warn({ totalTokens, MAX_INPUT_TOKENS }, "Token limit exceeded");
      const error = new ChatSDKError(
        "input_too_long:chat",
        `Message too long: ${totalTokens} tokens (max: ${MAX_INPUT_TOKENS})`
      );
      return error.toResponse();
    }

    const messageThreadToParent = isAnonymous
      ? anonymousPreviousMessages
      : await getThreadUpToMessageId(
          chatId,
          userMessage.metadata.parentMessageId
        );

    const previousMessages = messageThreadToParent.slice(-5);
    log.debug({ activeTools }, "active tools");

    // Create AbortController with 55s timeout for credit cleanup
    const abortController = new AbortController();
    const timeoutId = setTimeout(async () => {
      if (reservation) {
        await reservation.cleanup();
      }
      abortController.abort();
    }, 290_000); // 290 seconds

    // Ensure cleanup on any unhandled errors
    try {
      const messageId = generateUUID();
      const streamId = generateUUID();

      // Record this new stream so we can resume later - use Redis for all users
      if (redisPublisher) {
        const keyPrefix = isAnonymous
          ? `sparka-ai:anonymous-stream:${chatId}:${streamId}`
          : `sparka-ai:stream:${chatId}:${streamId}`;

        await redisPublisher.setEx(
          keyPrefix,
          600, // 10 minutes TTL
          JSON.stringify({ chatId, streamId, createdAt: Date.now() })
        );
      }

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
              isPartial: true,
              parentMessageId: userMessage.id,
              selectedModel: selectedModelId,
              selectedTool: undefined,
            },
          },
        });
      }

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

      // Build the data stream that will emit tokens
      const stream = createUIMessageStream<ChatMessage>({
        execute: async ({ writer: dataStream }) => {
          const { result, contextForLLM } = await createCoreChatAgent({
            system,
            userMessage,
            previousMessages,
            selectedModelId,
            selectedTool,
            userId,
            activeTools,
            abortSignal: abortController.signal,
            messageId,
            dataStream,
            onError: (error) => {
              log.error({ error }, "streamText error");
            },
          });

          const initialMetadata = {
            createdAt: new Date(),
            parentMessageId: userMessage.id,
            isPartial: false,
            selectedModel: selectedModelId,
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
                  return {
                    ...initialMetadata,
                    isPartial: false,
                    usage: part.totalUsage,
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
        onFinish: async ({
          messages,
          isContinuation: _isContinuation,
          responseMessage,
        }) => {
          // Clear timeout since we finished successfully
          clearTimeout(timeoutId);

          if (userId) {
            const actualCost =
              baseModelCost +
              messages
                .flatMap((message) => message.parts)
                .reduce((acc, toolResult) => {
                  if (!toolResult.type.startsWith("tool-")) {
                    return acc;
                  }

                  const toolDef =
                    toolsDefinitions[
                      toolResult.type.replace("tool-", "") as ToolName
                    ];

                  if (!toolDef) {
                    return acc;
                  }

                  return acc + toolDef.cost;
                }, 0);
            const _assistantMessage = responseMessage; // TODO: Fix this in ai sdk v5 - responseMessage is not a UIMessage
            try {
              // TODO: Validate if this is correct ai sdk v5
              const assistantMessage = messages.at(-1);

              if (!assistantMessage) {
                throw new Error("No assistant message found!");
              }

              if (!isAnonymous) {
                await updateMessage({
                  id: assistantMessage.id,
                  chatId,
                  message: assistantMessage,
                });
              }

              // Finalize credit usage: deduct actual cost, release reservation
              if (reservation) {
                await reservation.finalize(actualCost);
              }
            } catch (error) {
              log.error({ error }, "Failed to save chat or finalize credits");
              // Still release the reservation on error
              if (reservation) {
                await reservation.cleanup();
              }
            }
          }
        },

        onError: (error) => {
          // Clear timeout on error
          clearTimeout(timeoutId);
          log.error({ error }, "onError");
          // Release reserved credits on error (fire and forget)
          if (reservation) {
            reservation.cleanup();
          }
          if (anonymousSession) {
            anonymousSession.remainingCredits += baseModelCost;
            setAnonymousSession(anonymousSession);
          }
          return "Oops, an error occured!";
        },
      });

      after(async () => {
        // Cleanup to happen after the POST response is sent
        // Set TTL on Redis keys to auto-expire after 10 minutes
        if (redisPublisher) {
          try {
            const keyPattern = `sparka-ai:resumable-stream:rs:sentinel:${streamId}*`;
            const keys = await redisPublisher.keys(keyPattern);
            if (keys.length > 0) {
              // Set 5 minute expiration on all stream-related keys
              await Promise.all(
                keys.map((key: string) => redisPublisher.expire(key, 300))
              );
            }
          } catch (error) {
            log.error({ error }, "Failed to set TTL on stream keys");
          }
        }

        try {
          // Clean up stream info from Redis for all users
          if (redisPublisher) {
            const keyPrefix = isAnonymous
              ? `sparka-ai:anonymous-stream:${chatId}:${streamId}`
              : `sparka-ai:stream:${chatId}:${streamId}`;

            await redisPublisher.expire(keyPrefix, 300);
          }
        } catch (cleanupError) {
          log.error({ cleanupError }, "Failed to cleanup stream record");
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
    } catch (error) {
      clearTimeout(timeoutId);
      log.error({ error }, "error found in try block");
      if (reservation) {
        await reservation.cleanup();
      }
      if (anonymousSession) {
        anonymousSession.remainingCredits += baseModelCost;
        setAnonymousSession(anonymousSession);
      }
      throw error;
    }
  } catch (error) {
    log.error({ error }, "RESPONSE > POST /api/chat error");
    return new Response("An error occurred while processing your request!", {
      status: 404,
    });
  }
}

// DELETE moved to tRPC chat.deleteChat mutation
