import { createUIMessageStream, JsonToSseTransformStream } from "ai";
import { differenceInSeconds } from "date-fns";
import { headers } from "next/headers";
import { ChatSDKError } from "@/lib/ai/errors";
import type { ChatMessage } from "@/lib/ai/types";
import { auth } from "@/lib/auth";
import { getAllMessagesByChatId, getChatById } from "@/lib/db/queries";
import { getRedisPublisher, getStreamContext } from "../../route";

async function validateChatAccess({
  chatId,
  userId,
  isAuthenticated,
}: {
  chatId: string;
  userId: string | null;
  isAuthenticated: boolean;
}): Promise<Response | null> {
  // For authenticated users, check DB permissions first
  if (isAuthenticated) {
    const chat = await getChatById({ id: chatId });

    if (!chat) {
      return new ChatSDKError("not_found:chat").toResponse();
    }

    // If chat is not public, require authentication and ownership
    if (chat.visibility !== "public" && chat.userId !== userId) {
      console.log(
        "RESPONSE > GET /api/chat: Unauthorized - chat ownership mismatch"
      );
      return new ChatSDKError("forbidden:chat").toResponse();
    }
  }
  return null;
}

async function getStreamIds({
  chatId,
  isAuthenticated,
  redisPublisher,
}: {
  chatId: string;
  isAuthenticated: boolean;
  redisPublisher: any;
}): Promise<string[]> {
  if (!redisPublisher) {
    return [];
  }

  const keyPattern = isAuthenticated
    ? `sparka-ai:stream:${chatId}:*`
    : `sparka-ai:anonymous-stream:${chatId}:*`;

  const keys = await redisPublisher.keys(keyPattern);
  return keys
    .map((key: string) => {
      const parts = key.split(":");
      return parts.at(-1) || "";
    })
    .filter(Boolean);
}

async function createRestoredStream({
  chatId,
  resumeRequestedAt,
  emptyDataStream,
}: {
  chatId: string;
  resumeRequestedAt: Date;
  emptyDataStream: ReadableStream;
}): Promise<Response> {
  const messages = await getAllMessagesByChatId({ chatId });
  const mostRecentMessage = messages.at(-1);

  if (!mostRecentMessage) {
    return new Response(emptyDataStream, { status: 200 });
  }

  if (mostRecentMessage.role !== "assistant") {
    return new Response(emptyDataStream, { status: 200 });
  }

  const messageCreatedAt = new Date(mostRecentMessage.metadata.createdAt);

  if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
    return new Response(emptyDataStream, { status: 200 });
  }

  const restoredStream = createUIMessageStream<ChatMessage>({
    execute: ({ writer }) => {
      writer.write({
        type: "data-appendMessage",
        data: JSON.stringify(mostRecentMessage),
        transient: true,
      });
    },
  });

  return new Response(
    restoredStream.pipeThrough(new JsonToSseTransformStream()),
    { status: 200 }
  );
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;

  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  if (!chatId) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id || null;
  const isAuthenticated = userId !== null;

  const validationError = await validateChatAccess({
    chatId,
    userId,
    isAuthenticated,
  });

  if (validationError) {
    return validationError;
  }

  const redisPublisher = getRedisPublisher();

  // Get streams from Redis for all users
  const streamIds = await getStreamIds({
    chatId,
    isAuthenticated,
    redisPublisher,
  });

  if (!streamIds.length) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError("not_found:stream").toResponse();
  }

  const emptyDataStream = createUIMessageStream<ChatMessage>({
    execute: () => {
      // Intentionally empty - used as a fallback stream when stream context is unavailable
    },
  });

  const stream = await streamContext.resumableStream(recentStreamId, () =>
    emptyDataStream.pipeThrough(new JsonToSseTransformStream())
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    return await createRestoredStream({
      chatId,
      resumeRequestedAt,
      emptyDataStream,
    });
  }

  return new Response(stream, { status: 200 });
}
