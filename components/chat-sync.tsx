"use client";

import { useChat } from "@ai-sdk-tools/store";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { toast } from "sonner";
import { useDataStream } from "@/components/data-stream-provider";
import { useSaveMessageMutation } from "@/hooks/chat-sync-hooks";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { ChatSDKError } from "@/lib/ai/errors";
import type { ChatMessage } from "@/lib/ai/types";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";

export function ChatSync({
  id,
  initialMessages,
  projectId,
}: {
  id: string;
  initialMessages: ChatMessage[];
  projectId?: string;
}) {
  const { data: session } = useSession();
  const { mutate: saveChatMessage } = useSaveMessageMutation();
  const { setDataStream } = useDataStream();
  const [autoResume, setAutoResume] = useState(true);

  const isAuthenticated = !!session?.user;

  const helpers = useChat<ChatMessage>({
    experimental_throttle: 100,
    id,
    messages: initialMessages,
    generateId: generateUUID,
    onFinish: ({ message }) => {
      console.log("onFinish", message);
      saveChatMessage({ message, chatId: id });
      setAutoResume(true);
    },
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest({ messages, id: requestId, body }) {
        setAutoResume(true);

        return {
          body: {
            id: requestId,
            message: messages.at(-1),
            prevMessages: isAuthenticated ? [] : messages.slice(0, -1),
            projectId,
            ...body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onError: (error) => {
      if (
        error instanceof ChatSDKError &&
        error.type === "not_found" &&
        error.surface === "stream"
      ) {
        setAutoResume(false);
      }

      console.error(error);
      const cause = error.cause;
      if (cause && typeof cause === "string") {
        toast.error(error.message ?? "An error occured, please try again!", {
          description: cause,
        });
      } else {
        toast.error(error.message ?? "An error occured, please try again!");
      }
    },
  });

  console.log("messages helpers", helpers.messages);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream: helpers.resumeStream,
  });

  return null;
}
