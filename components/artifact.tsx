import type { UseChatHelpers } from "@ai-sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useDebounceCallback, useWindowSize } from "usehooks-ts";
import { useDocuments, useSaveDocument } from "@/hooks/chat-sync-hooks";
import { useArtifact } from "@/hooks/use-artifact";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ChatMessage } from "@/lib/ai/types";
//
import type { ArtifactKind } from "@/lib/artifacts/artifact-kind";
import { codeArtifact } from "@/lib/artifacts/code/client";
import { sheetArtifact } from "@/lib/artifacts/sheet/client";
import { textArtifact } from "@/lib/artifacts/text/client";
import type { Document, Vote } from "@/lib/db/schema";
import { useChatStoreApi } from "@/lib/stores/chat-store-context";
import { useTRPC } from "@/trpc/react";
import { ArtifactActions } from "./artifact-actions";
import { ArtifactCloseButton } from "./artifact-close-button";
import { MessagesPane } from "./messages-pane";
//
import { Toolbar } from "./toolbar";
import { ScrollArea } from "./ui/scroll-area";
import { useSidebar } from "./ui/sidebar";
import { VersionFooter } from "./version-footer";

export const artifactDefinitions = [textArtifact, codeArtifact, sheetArtifact];

export type UIArtifact = {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  messageId: string;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};

function useDocumentVersioning({
  documents,
  artifact,
  setArtifact,
}: {
  documents: Document[] | undefined;
  artifact: UIArtifact;
  setArtifact: ReturnType<typeof useArtifact>["setArtifact"];
}) {
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocumentIndex = documents.findLastIndex(
        (doc) => doc.messageId === artifact.messageId
      );

      if (mostRecentDocumentIndex !== -1) {
        const mostRecentDocument = documents[mostRecentDocumentIndex];
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(mostRecentDocumentIndex);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? "",
        }));
      } else {
        const latestDocument = documents.at(-1);
        if (latestDocument) {
          setDocument(latestDocument);
          setCurrentVersionIndex(documents.length - 1);
          setArtifact((currentArtifact) => ({
            ...currentArtifact,
            content: latestDocument.content ?? "",
          }));
        }
      }
    }
  }, [documents, setArtifact, artifact.messageId]);

  return { document, currentVersionIndex, setCurrentVersionIndex };
}

function useDocumentSaving({
  artifact,
  isReadonly,
  documents,
}: {
  artifact: UIArtifact;
  isReadonly: boolean;
  documents: Document[] | undefined;
}) {
  const [isContentDirty, setIsContentDirty] = useState(false);
  const lastSavedContentRef = useRef<string>("");

  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId,
    {
      onSettled: () => {
        setIsContentDirty(false);
      },
    }
  );

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!documents) {
        return;
      }

      const lastDocument = documents.at(-1);
      if (!lastDocument) {
        return;
      }

      if (
        lastDocument?.content !== updatedContent &&
        lastSavedContentRef.current === updatedContent
      ) {
        setIsContentDirty(true);
        saveDocumentMutation.mutate({
          id: lastDocument.id,
          title: lastDocument.title,
          content: updatedContent,
          kind: lastDocument.kind,
        });
      }
    },
    [saveDocumentMutation, documents]
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (isReadonly) {
        return;
      }
      lastSavedContentRef.current = updatedContent;

      const lastDocument = documents?.at(-1);
      if (lastDocument && updatedContent !== lastDocument.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [documents, debouncedHandleContentChange, handleContentChange, isReadonly]
  );

  return { isContentDirty, saveContent };
}

function getArtifactPanelAnimation({
  isMobile,
  windowWidth,
  windowHeight,
  artifact,
}: {
  isMobile: boolean;
  windowWidth: number;
  windowHeight: number;
  artifact: UIArtifact;
}) {
  const mobileAnimation = {
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      height: windowHeight,
      width: windowWidth || "calc(100dvw)",
      borderRadius: 0,
      transition: {
        delay: 0,
        type: "spring" as const,
        stiffness: 200,
        damping: 30,
        duration: 5000,
      },
    },
    initial: {
      opacity: 1,
      x: artifact.boundingBox.left,
      y: artifact.boundingBox.top,
      height: artifact.boundingBox.height,
      width: artifact.boundingBox.width,
      borderRadius: 50,
    },
  };

  const desktopAnimation = {
    animate: {
      opacity: 1,
      x: 400,
      y: 0,
      height: windowHeight,
      width: windowWidth ? windowWidth - 400 : "calc(100dvw-400px)",
      borderRadius: 0,
      transition: {
        delay: 0,
        type: "spring" as const,
        stiffness: 200,
        damping: 30,
        duration: 5000,
      },
    },
    initial: {
      opacity: 1,
      x: artifact.boundingBox.left,
      y: artifact.boundingBox.top,
      height: artifact.boundingBox.height,
      width: artifact.boundingBox.width,
      borderRadius: 50,
    },
  };

  return isMobile ? mobileAnimation : desktopAnimation;
}

function createVersionChangeHandler({
  documents,
  setCurrentVersionIndex,
  setMode,
  currentVersionIndex,
}: {
  documents: Document[] | undefined;
  setCurrentVersionIndex: (index: number | ((prev: number) => number)) => void;
  setMode: (
    mode: "edit" | "diff" | ((prev: "edit" | "diff") => "edit" | "diff")
  ) => void;
  currentVersionIndex: number;
}) {
  return (type: "next" | "prev" | "toggle" | "latest") => {
    if (!documents) {
      return;
    }

    if (type === "latest") {
      setCurrentVersionIndex(documents.length - 1);
      setMode("edit");
      return;
    }

    if (type === "toggle") {
      setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"));
      return;
    }

    if (type === "prev" && currentVersionIndex > 0) {
      setCurrentVersionIndex((index) => index - 1);
      return;
    }

    if (type === "next" && currentVersionIndex < documents.length - 1) {
      setCurrentVersionIndex((index) => index + 1);
    }
  };
}

function useArtifactInitialization({
  artifact,
  artifactDefinition,
  setMetadata,
  trpc,
  queryClient,
  isAuthenticated,
}: {
  artifact: UIArtifact;
  artifactDefinition: (typeof artifactDefinitions)[number];
  setMetadata: ReturnType<typeof useArtifact>["setMetadata"];
  trpc: ReturnType<typeof useTRPC>;
  queryClient: ReturnType<typeof useQueryClient>;
  isAuthenticated: boolean;
}) {
  useEffect(() => {
    if (
      artifact.documentId !== "init" &&
      artifact.status !== "streaming" &&
      artifactDefinition.initialize
    ) {
      artifactDefinition.initialize({
        documentId: artifact.documentId,
        setMetadata,
        trpc,
        queryClient,
        isAuthenticated,
      });
    }
  }, [
    artifact.documentId,
    artifactDefinition,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
    artifact.status,
  ]);
}

function MessagesSidebar({
  isMobile,
  isCurrentVersion,
  chatId,
  isReadonly,
  status,
  votes,
}: {
  isMobile: boolean;
  isCurrentVersion: boolean;
  chatId: string;
  isReadonly: boolean;
  status: UseChatHelpers<ChatMessage>["status"];
  votes: Vote[] | undefined;
}) {
  if (isMobile) {
    return null;
  }

  return (
    <motion.div
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
          delay: 0.2,
          type: "spring",
          stiffness: 200,
          damping: 30,
        },
      }}
      className="relative h-dvh w-[400px] shrink-0 bg-muted dark:bg-background"
      exit={{
        opacity: 0,
        x: 0,
        scale: 1,
        transition: { duration: 0 },
      }}
      initial={{ opacity: 0, x: 10, scale: 1 }}
    >
      <AnimatePresence>
        {!isCurrentVersion && (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute top-0 left-0 z-50 h-dvh w-[400px] bg-zinc-900/50"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      <div className="@container flex h-full flex-col">
        <MessagesPane
          chatId={chatId}
          className="size-full"
          isReadonly={isReadonly}
          isVisible={true}
          status={status}
          votes={votes}
        />
      </div>
    </motion.div>
  );
}

function ArtifactHeader({
  artifact,
  isContentDirty,
  document,
  currentVersionIndex,
  handleVersionChange,
  isCurrentVersion,
  isReadonly,
  metadata,
  mode,
  setMetadata,
}: {
  artifact: UIArtifact;
  isContentDirty: boolean;
  document: Document | null;
  currentVersionIndex: number;
  handleVersionChange: (type: "next" | "prev" | "toggle" | "latest") => void;
  isCurrentVersion: boolean;
  isReadonly: boolean;
  metadata: any;
  mode: "edit" | "diff";
  setMetadata: ReturnType<typeof useArtifact>["setMetadata"];
}) {
  return (
    <div className="flex flex-row items-start justify-between bg-background/80 p-2">
      <div className="flex flex-row items-start gap-4">
        <ArtifactCloseButton />

        <div className="flex flex-col">
          <div className="font-medium">{artifact.title}</div>

          {isContentDirty && (
            <div className="text-muted-foreground text-sm">
              Saving changes...
            </div>
          )}
          {!isContentDirty && document && (
            <div className="text-muted-foreground text-sm">
              {`Updated ${formatDistance(
                new Date(document.createdAt),
                new Date(),
                {
                  addSuffix: true,
                }
              )}`}
            </div>
          )}
          {!(isContentDirty || document) && (
            <div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-muted-foreground/20" />
          )}
        </div>
      </div>

      <ArtifactActions
        artifact={artifact}
        currentVersionIndex={currentVersionIndex}
        handleVersionChange={handleVersionChange}
        isCurrentVersion={isCurrentVersion}
        isReadonly={isReadonly}
        metadata={metadata}
        mode={mode}
        setMetadata={setMetadata}
      />
    </div>
  );
}

function PureArtifact({
  chatId,
  status,
  stop,
  votes,
  isReadonly,
  isAuthenticated,
}: {
  chatId: string;
  votes: Vote[] | undefined;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  isReadonly: boolean;
  isAuthenticated: boolean;
}) {
  const storeApi = useChatStoreApi();
  const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const { data: documents, isLoading: isDocumentsFetching } = useDocuments(
    artifact.documentId || "",
    artifact.documentId === "init" || artifact.status === "streaming"
  );

  const [mode, setMode] = useState<"edit" | "diff">("edit");
  const { document, currentVersionIndex, setCurrentVersionIndex } =
    useDocumentVersioning({
      documents,
      artifact,
      setArtifact,
    });

  const { isContentDirty, saveContent } = useDocumentSaving({
    artifact,
    isReadonly,
    documents,
  });

  const { open: isSidebarOpen } = useSidebar();

  function getDocumentContentById(index: number) {
    if (!documents) {
      return "";
    }
    if (!documents[index]) {
      return "";
    }
    return documents[index].content ?? "";
  }

  const handleVersionChange = createVersionChangeHandler({
    documents,
    setCurrentVersionIndex,
    setMode,
    currentVersionIndex,
  });

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = useIsMobile();

  const artifactDefinition = artifactDefinitions.find(
    (definition) => definition.kind === artifact.kind
  );

  if (!artifactDefinition) {
    throw new Error("Artifact definition not found!");
  }

  const panelAnimation = getArtifactPanelAnimation({
    isMobile,
    windowWidth,
    windowHeight,
    artifact,
  });

  useArtifactInitialization({
    artifact,
    artifactDefinition,
    setMetadata,
    trpc,
    queryClient,
    isAuthenticated,
  });

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
          data-testid="artifact"
          exit={{ opacity: 0, transition: { delay: 0.4 } }}
          initial={{ opacity: 1 }}
        >
          {!isMobile && (
            <motion.div
              animate={{ width: windowWidth, right: 0 }}
              className="fixed h-dvh bg-background"
              exit={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
              initial={{
                width: isSidebarOpen ? windowWidth - 256 : windowWidth,
                right: 0,
              }}
            />
          )}

          <MessagesSidebar
            chatId={chatId}
            isCurrentVersion={isCurrentVersion}
            isMobile={isMobile}
            isReadonly={isReadonly}
            status={status}
            votes={votes}
          />

          <motion.div
            animate={panelAnimation.animate}
            className="fixed flex h-dvh flex-col overflow-y-auto border-zinc-200 bg-background md:border-l dark:border-zinc-700"
            exit={{
              opacity: 0,
              scale: 0.5,
              transition: {
                delay: 0.1,
                type: "spring",
                stiffness: 600,
                damping: 30,
              },
            }}
            initial={panelAnimation.initial}
          >
            <ArtifactHeader
              artifact={artifact}
              currentVersionIndex={currentVersionIndex}
              document={document}
              handleVersionChange={handleVersionChange}
              isContentDirty={isContentDirty}
              isCurrentVersion={isCurrentVersion}
              isReadonly={isReadonly}
              metadata={metadata}
              mode={mode}
              setMetadata={setMetadata}
            />

            <ScrollArea className="h-full max-w-full!">
              <div className="flex flex-col items-center bg-background/80">
                <artifactDefinition.content
                  content={
                    isCurrentVersion
                      ? artifact.content
                      : getDocumentContentById(currentVersionIndex)
                  }
                  currentVersionIndex={currentVersionIndex}
                  getDocumentContentById={getDocumentContentById}
                  isCurrentVersion={isCurrentVersion}
                  isInline={false}
                  isLoading={isDocumentsFetching && !artifact.content}
                  isReadonly={isReadonly}
                  metadata={metadata}
                  mode={mode}
                  onSaveContent={saveContent}
                  setMetadata={setMetadata}
                  status={artifact.status}
                  suggestions={[]}
                  title={artifact.title}
                />

                <AnimatePresence>
                  {isCurrentVersion && !isReadonly && (
                    <Toolbar
                      artifactKind={artifact.kind}
                      isToolbarVisible={isToolbarVisible}
                      setIsToolbarVisible={setIsToolbarVisible}
                      status={status}
                      stop={stop}
                      storeApi={storeApi}
                    />
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            <AnimatePresence>
              {!(isCurrentVersion || isReadonly) && (
                <VersionFooter
                  currentVersionIndex={currentVersionIndex}
                  documents={documents}
                  handleVersionChange={handleVersionChange}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
  if (prevProps.status !== nextProps.status) {
    return false;
  }
  if (prevProps.stop !== nextProps.stop) {
    return false;
  }
  if (!equal(prevProps.votes, nextProps.votes)) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.isAuthenticated !== nextProps.isAuthenticated) {
    return false;
  }

  return true;
});
