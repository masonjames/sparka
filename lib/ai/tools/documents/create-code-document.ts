import { tool } from "ai";
import { z } from "zod";
import { saveDocument } from "@/lib/db/queries";
import { generateUUID } from "@/lib/utils";
import type { DocumentToolContext, DocumentToolResult } from "./types";

export const createCodeDocumentTool = ({
  session,
  messageId,
}: DocumentToolContext) =>
  tool({
    description: `Create a code document/file.

Use for:
- Python scripts and programs
- Code snippets that need to be saved
- Single-file code examples

The title MUST include the file extension (e.g., "script.py", "App.tsx", "utils.js").
This extension determines syntax highlighting.`,
    inputSchema: z.object({
      title: z
        .string()
        .describe(
          'Filename with extension (e.g., "script.py", "component.tsx", "utils.js")'
        ),
      content: z.string().describe("The full code content of the document"),
    }),

    async execute({ title, content }): Promise<DocumentToolResult> {
      const id = generateUUID();

      if (session.user?.id) {
        await saveDocument({
          id,
          title,
          content,
          kind: "code",
          userId: session.user.id,
          messageId,
        });
      }

      return {
        status: "success",
        documentId: id,
        result: "A document was created and is now visible to the user.",
      };
    },
  });
