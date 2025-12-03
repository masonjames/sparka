"use client";

// Hooks for chat data fetching and mutations
// For authenticated users only - anonymous users don't persist data

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { ChatMessage } from "@/lib/ai/types";
import { getAnonymousSession } from "@/lib/anonymous-session-client";
import type { Document, Project } from "@/lib/db/schema";
import { ANONYMOUS_LIMITS } from "@/lib/types/anonymous";
import type { UIChat } from "@/lib/types/ui-chat";
import { useChatId } from "@/providers/chat-id-provider";
import { useSession } from "@/providers/session-provider";
import { useTRPC } from "@/trpc/react";

const DISABLED_PROJECT_ID = "00000000-0000-0000-0000-000000000000";

async function invalidateChat({
  queryClient,
  trpc,
  chatId,
}: {
  queryClient: ReturnType<typeof useQueryClient>;
  trpc: ReturnType<typeof useTRPC>;
  chatId: string;
}) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getAllChats.queryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: trpc.chat.getChatById.queryKey({ chatId }),
    }),
  ]);
}

export function useProject(
  projectId: string | null,
  { enabled }: { enabled?: boolean } = {}
) {
  const trpc = useTRPC();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const fallbackProjectId = projectId ?? DISABLED_PROJECT_ID;
  const projectQueryOptions = trpc.project.getById.queryOptions({
    id: fallbackProjectId,
  });

  return useQuery({
    ...projectQueryOptions,
    enabled: (enabled ?? true) && isAuthenticated && !!projectId,
  });
}

export function useGetChatMessagesQueryOptions() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const { id: chatId, type } = useChatId();

  const getMessagesByChatIdQueryOptions = useMemo(
    () => ({
      ...trpc.chat.getChatMessages.queryOptions({ chatId: chatId || "" }),
      enabled: !!chatId && isAuthenticated && type === "chat",
    }),
    [trpc, isAuthenticated, chatId, type]
  );

  return getMessagesByChatIdQueryOptions;
}

export function useMessagesQuery() {
  const options = useGetChatMessagesQueryOptions();
  return options;
}

type ChatMutationOptions = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function useDeleteChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const qc = useQueryClient();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats]
  );

  const trpcOptions = trpc.chat.deleteChat.mutationOptions();

  const deleteMutation = useMutation<
    Awaited<ReturnType<NonNullable<typeof trpcOptions.mutationFn>>>,
    Error,
    { chatId: string },
    { previousChats?: UIChat[] }
  >({
    mutationFn: trpcOptions.mutationFn,
    onMutate: async ({ chatId }) => {
      if (!isAuthenticated) {
        return { previousChats: undefined };
      }
      await qc.cancelQueries({ queryKey: getAllChatsQueryKey });
      const previousChats = qc.getQueryData<UIChat[]>(getAllChatsQueryKey);
      qc.setQueryData<UIChat[]>(
        getAllChatsQueryKey,
        (old) => old?.filter((c) => c.id !== chatId) ?? old
      );
      return { previousChats };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousChats) {
        qc.setQueryData(getAllChatsQueryKey, ctx.previousChats);
      }
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: getAllChatsQueryKey });
    },
  });

  const deleteChat = useCallback(
    async (chatId: string, options?: ChatMutationOptions) => {
      if (!isAuthenticated) {
        return;
      }
      try {
        await deleteMutation.mutateAsync({ chatId });
        options?.onSuccess?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error : new Error("Unknown error");
        options?.onError?.(errorMessage);
        throw errorMessage;
      }
    },
    [deleteMutation, isAuthenticated]
  );

  return { deleteChat };
}

export function useRenameChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats]
  );

  const trpcOptions = trpc.chat.renameChat.mutationOptions();

  return useMutation<
    Awaited<ReturnType<NonNullable<typeof trpcOptions.mutationFn>>>,
    Error,
    { chatId: string; title: string },
    { previousChats?: UIChat[]; previousChatById?: UIChat | null }
  >({
    mutationFn: trpcOptions.mutationFn,
    onMutate: async ({ chatId, title }) => {
      if (!isAuthenticated) {
        return { previousChats: undefined, previousChatById: undefined };
      }
      const chatByIdQueryKey = trpc.chat.getChatById.queryKey({ chatId });

      await Promise.all([
        queryClient.cancelQueries({ queryKey: getAllChatsQueryKey }),
        queryClient.cancelQueries({ queryKey: chatByIdQueryKey }),
      ]);

      const previousChats =
        queryClient.getQueryData<UIChat[]>(getAllChatsQueryKey);
      const previousChatById = queryClient.getQueryData<UIChat | null>(
        chatByIdQueryKey
      );

      queryClient.setQueryData<UIChat[] | undefined>(
        getAllChatsQueryKey,
        (old) => {
          if (!old) {
            return old;
          }
          return old.map((c) => (c.id === chatId ? { ...c, title } : c));
        }
      );

      if (previousChatById) {
        queryClient.setQueryData<UIChat | null>(chatByIdQueryKey, {
          ...previousChatById,
          title,
        });
      }

      return { previousChats, previousChatById };
    },
    onError: (_err, { chatId }, ctx) => {
      if (ctx?.previousChats) {
        queryClient.setQueryData(getAllChatsQueryKey, ctx.previousChats);
      }

      if (ctx?.previousChatById !== undefined) {
        const chatByIdQueryKey = trpc.chat.getChatById.queryKey({ chatId });
        queryClient.setQueryData<UIChat | null>(
          chatByIdQueryKey,
          ctx.previousChatById
        );
      }
      toast.error("Failed to rename chat");
    },
    onSettled: async (_data, _error, { chatId }) => {
      await invalidateChat({ queryClient, trpc, chatId });
    },
  });
}

export function useRenameProject() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.project.update.mutationOptions({
      onMutate: async (variables) => {
        const listKey = trpc.project.list.queryKey();
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData<Project[]>(listKey);
        const nextName =
          typeof variables.updates.name === "string"
            ? variables.updates.name
            : undefined;
        if (nextName) {
          queryClient.setQueryData<Project[] | undefined>(listKey, (old) =>
            old
              ? old.map((p) =>
                  p.id === variables.id ? { ...p, name: nextName } : p
                )
              : old
          );
        }
        return { previous } as { previous?: Project[] };
      },
      onError: (_error, _variables, context) => {
        const listKey = trpc.project.list.queryKey();
        if ((context as { previous?: Project[] } | undefined)?.previous) {
          queryClient.setQueryData(
            listKey,
            (context as { previous?: Project[] }).previous
          );
        }
        toast.error("Failed to rename project");
      },
      onSuccess: () => {
        toast.success("Project renamed");
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.project.list.queryKey(),
        });
      },
    })
  );
}

export function usePinChat() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats]
  );

  const trpcOptions = trpc.chat.setIsPinned.mutationOptions();

  return useMutation<
    Awaited<ReturnType<NonNullable<typeof trpcOptions.mutationFn>>>,
    Error,
    { chatId: string; isPinned: boolean },
    { previousChats?: UIChat[] }
  >({
    mutationFn: trpcOptions.mutationFn,
    onMutate: async ({ chatId, isPinned }) => {
      if (!isAuthenticated) {
        return { previousChats: undefined };
      }
      await queryClient.cancelQueries({ queryKey: getAllChatsQueryKey });
      const previousChats =
        queryClient.getQueryData<UIChat[]>(getAllChatsQueryKey);
      queryClient.setQueryData<UIChat[]>(getAllChatsQueryKey, (old) => {
        if (!old) {
          return old;
        }
        return old.map((c) => (c.id === chatId ? { ...c, isPinned } : c));
      });
      return { previousChats };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousChats) {
        queryClient.setQueryData(getAllChatsQueryKey, ctx.previousChats);
      }
      toast.error("Failed to pin chat");
    },
    onSettled: async (_data, _error, { chatId }) => {
      await invalidateChat({ queryClient, trpc, chatId });
    },
  });
}

export function useDeleteTrailingMessages() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const invalidateMessagesByChatId = useCallback(
    (chatId: string) => {
      queryClient.invalidateQueries({
        queryKey: trpc.chat.getChatMessages.queryKey({ chatId }),
      });
    },
    [queryClient, trpc.chat.getChatMessages]
  );

  const trpcOptions = trpc.chat.deleteTrailingMessages.mutationOptions();

  return useMutation<
    Awaited<ReturnType<NonNullable<typeof trpcOptions.mutationFn>>>,
    Error,
    { messageId: string; chatId: string },
    { previousMessages?: ChatMessage[]; messagesQueryKey?: readonly unknown[] }
  >({
    mutationFn: trpcOptions.mutationFn,
    onMutate: async ({ messageId, chatId }) => {
      if (!isAuthenticated) {
        return { previousMessages: undefined, messagesQueryKey: undefined };
      }
      const messagesQueryKey = trpc.chat.getChatMessages.queryKey({ chatId });
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });
      const previousMessages =
        queryClient.getQueryData<ChatMessage[]>(messagesQueryKey);
      queryClient.setQueryData<ChatMessage[] | undefined>(
        messagesQueryKey,
        (old) => {
          if (!old) {
            return old;
          }
          const messageIndex = old.findIndex((msg) => msg.id === messageId);
          if (messageIndex === -1) {
            return old;
          }
          return old.slice(0, messageIndex);
        }
      );
      return { previousMessages, messagesQueryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousMessages && ctx?.messagesQueryKey) {
        queryClient.setQueryData(ctx.messagesQueryKey, ctx.previousMessages);
      }
      toast.error("Failed to delete messages");
    },
    onSuccess: (_data, { chatId }) => {
      invalidateMessagesByChatId(chatId);
      toast.success("Messages deleted");
    },
  });
}

export function useCloneChat() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats]
  );

  return useMutation({
    ...trpc.chat.cloneSharedChat.mutationOptions(),
    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: getAllChatsQueryKey });
    },
    onError: (error) => {
      console.error("Failed to copy chat:", error);
    },
  });
}

export function useSaveMessageMutation() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      message: _message,
      chatId: _chatId,
    }: {
      message: ChatMessage;
      chatId: string;
    }) => {
      // For authenticated users, the API handles persistence
      // For anonymous users, we just do optimistic updates (no persistence)
      return Promise.resolve({ success: true } as const);
    },
    onMutate: async ({ message, chatId }) => {
      const messagesQueryKey = trpc.chat.getChatMessages.queryKey({ chatId });
      await queryClient.cancelQueries({ queryKey: messagesQueryKey });
      const previousMessages =
        queryClient.getQueryData<ChatMessage[]>(messagesQueryKey);
      queryClient.setQueryData<ChatMessage[]>(messagesQueryKey, (old) => {
        if (!old) {
          return [message];
        }
        return [...old, message];
      });
      return { previousMessages, messagesQueryKey } as const;
    },
    onError: (err, _vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          context.messagesQueryKey,
          context.previousMessages
        );
      }
      console.error("Failed to save message:", err);
      toast.error("Failed to save message");
    },
    onSuccess: async (_data, { message, chatId }) => {
      if (isAuthenticated && message.role === "assistant") {
        queryClient.invalidateQueries({
          queryKey: trpc.credits.getAvailableCredits.queryKey(),
        });
        await invalidateChat({ queryClient, trpc, chatId });
      }
    },
  });
}

export function useSetVisibility() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const getAllChatsQueryKey = useMemo(
    () => trpc.chat.getAllChats.queryKey(),
    [trpc.chat.getAllChats]
  );

  return useMutation({
    ...trpc.chat.setVisibility.mutationOptions(),
    onError: () => {
      toast.error("Failed to update chat visibility");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: getAllChatsQueryKey });
    },
    onSuccess: (
      _data,
      variables: { chatId: string; visibility: "private" | "public" }
    ) => {
      const message =
        variables.visibility === "public"
          ? "Chat is now public - anyone with the link can access it"
          : "Chat is now private - only you can access it";
      toast.success(message);
    },
  });
}

export function useSaveDocument(
  _documentId: string,
  messageId: string,
  options?: {
    onSettled?: (result: unknown, error: unknown, params: unknown) => void;
  }
) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const trpcOptions = trpc.document.saveDocument.mutationOptions();

  return useMutation<
    Awaited<ReturnType<NonNullable<typeof trpcOptions.mutationFn>>>,
    Error,
    { id: string; title: string; content: string; kind: Document["kind"] },
    { previousDocuments?: Document[]; newDocument?: { id: string } }
  >({
    mutationFn: trpcOptions.mutationFn,
    onMutate: async (newDocument) => {
      const queryKey = trpc.document.getDocuments.queryKey({
        id: newDocument.id,
      });
      await queryClient.cancelQueries({ queryKey });
      const previousDocuments =
        queryClient.getQueryData<Document[]>(queryKey) ?? [];
      const optimisticData: Document[] = [
        ...previousDocuments,
        {
          id: newDocument.id,
          createdAt: new Date(),
          title: newDocument.title,
          content: newDocument.content,
          kind: newDocument.kind as Document["kind"],
          userId: userId || "",
          messageId,
        } as Document,
      ];
      queryClient.setQueryData(queryKey, optimisticData);
      return { previousDocuments, newDocument };
    },
    onError: (_err, newDocument, ctx) => {
      if (ctx?.previousDocuments) {
        const queryKey = trpc.document.getDocuments.queryKey({
          id: newDocument.id,
        });
        queryClient.setQueryData(queryKey, ctx.previousDocuments);
      }
    },
    onSettled: (result, error, params) => {
      queryClient.invalidateQueries({
        queryKey: trpc.document.getDocuments.queryKey({
          id: params.id,
        }),
      });
      options?.onSettled?.(result, error, params);
    },
  });
}

export function useDocuments(id: string, disable: boolean) {
  const trpc = useTRPC();
  const { type } = useChatId();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const queryOptions =
    type === "shared"
      ? trpc.document.getPublicDocuments.queryOptions({ id })
      : trpc.document.getDocuments.queryOptions({ id });

  return useQuery({
    ...queryOptions,
    enabled: !disable && !!id && (type === "shared" || isAuthenticated),
  });
}

export function useGetAllChats(limit?: number) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();

  return useQuery({
    ...trpc.chat.getAllChats.queryOptions(),
    enabled: isAuthenticated,
    select: limit ? (data: UIChat[]) => data.slice(0, limit) : undefined,
  });
}

export function useGetChatByIdQueryOptions(chatId: string) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();

  const getChatByIdQueryOptions = useMemo(
    () => ({
      ...trpc.chat.getChatById.queryOptions({ chatId }),
      enabled: !!chatId && isAuthenticated,
    }),
    [trpc, isAuthenticated, chatId]
  );

  return getChatByIdQueryOptions;
}

export function useGetChatById(
  chatId: string,
  { enabled }: { enabled?: boolean } = {}
) {
  const options = useGetChatByIdQueryOptions(chatId);
  return useQuery({
    ...options,
    // Both conditions must be true: caller's enabled AND auth check from options
    enabled: (enabled ?? true) && (options.enabled ?? true),
  });
}

export function useGetCredits() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const trpc = useTRPC();

  // For authenticated users, use tRPC query
  const authQueryOptions = trpc.credits.getAvailableCredits.queryOptions();

  const { data: creditsData, isLoading: isLoadingCredits } = useQuery({
    ...authQueryOptions,
    enabled: isAuthenticated,
  });

  // For anonymous users, read from local session
  if (!isAuthenticated) {
    const anonymousSession = getAnonymousSession();
    return {
      credits: anonymousSession?.remainingCredits ?? ANONYMOUS_LIMITS.CREDITS,
      isLoadingCredits: false,
    };
  }

  return {
    credits: (creditsData as { totalCredits: number } | undefined)
      ?.totalCredits,
    isLoadingCredits,
  };
}
