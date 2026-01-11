import type { ModelId } from "@/lib/ai/app-model-id";
import type { ToolSession } from "@/lib/ai/tools/types";
import { codeDocumentHandler } from "@/lib/artifacts/code/server";
import { sheetDocumentHandler } from "@/lib/artifacts/sheet/server";
import { textDocumentHandler } from "@/lib/artifacts/text/server";
import type { CostAccumulator } from "@/lib/credits/cost-accumulator";
import type { StreamWriter } from "../ai/types";
import { saveDocument } from "../db/queries";
import type { Document } from "../db/schema";
import type { ArtifactKind } from "./artifact-kind";

export type SaveDocumentProps = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
};

export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  dataStream: StreamWriter;
  session: ToolSession;
  description: string;
  prompt: string;
  messageId: string;
  selectedModel: ModelId;
  costAccumulator?: CostAccumulator;
};

export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: StreamWriter;
  session: ToolSession;
  messageId: string;
  selectedModel: ModelId;
  costAccumulator?: CostAccumulator;
};

export type DocumentHandler<T = ArtifactKind> = {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
};

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument(args);

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
          messageId: args.messageId,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument(args);

      if (args.session?.user?.id) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.session.user.id,
          messageId: args.messageId,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: DocumentHandler[] = [
  textDocumentHandler,
  codeDocumentHandler,
  sheetDocumentHandler,
];
