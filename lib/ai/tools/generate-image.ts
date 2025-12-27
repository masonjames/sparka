import { type FileUIPart, generateImage, tool } from "ai";
import { z } from "zod";
import { getImageModel } from "@/lib/ai/providers";
import { siteConfig } from "@/lib/config";
import { uploadFile } from "@/lib/blob";
import { createModuleLogger } from "@/lib/logger";

type GenerateImageProps = {
  attachments?: FileUIPart[];
  lastGeneratedImage?: { imageUrl: string; name: string } | null;
};

const log = createModuleLogger("ai.tools.generate-image");

type ImageMode = "edit" | "generate";

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function collectEditImages({
  imageParts,
  lastGeneratedImage,
}: {
  imageParts: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
}): Promise<Buffer[]> {
  return await Promise.all([
    ...(lastGeneratedImage
      ? [fetchImageBuffer(lastGeneratedImage.imageUrl)]
      : []),
    ...imageParts.map((p) => fetchImageBuffer(p.url)),
  ]);
}

function serializeError(err: unknown): {
  name?: string;
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }

  return { message: String(err) };
}

async function runGenerateImage({
  mode,
  prompt,
  imageParts,
  lastGeneratedImage,
  startMs,
}: {
  mode: ImageMode;
  prompt: string;
  imageParts: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  startMs: number;
}): Promise<{ imageUrl: string; prompt: string }> {
  let promptInput:
    | string
    | {
        text: string;
        images: Buffer[];
      };

  if (mode === "edit") {
    log.debug(
      {
        note: "OpenAI edit mode",
        lastGeneratedCount: lastGeneratedImage ? 1 : 0,
        attachmentCount: imageParts.length,
      },
      "generateImage: preparing edit images"
    );

    const inputImages = await collectEditImages({
      imageParts,
      lastGeneratedImage,
    });
    promptInput = { text: prompt, images: inputImages };
  } else {
    promptInput = prompt;
  }

  const res = await generateImage({
    // For edits, OpenAI expects `gpt-image-1` and accepts input images via prompt.images
    model: getImageModel(siteConfig.models.defaults.image),
    prompt: promptInput,
    n: 1,
    providerOptions: {
      telemetry: { isEnabled: true },
    },
  });

  log.debug(
    {
      mode,
      base64Length: res.images?.[0]?.base64?.length ?? 0,
    },
    "generateImage: provider response received"
  );

  const buffer = Buffer.from(res.images[0].base64, "base64");
  const timestamp = Date.now();
  const filename = `generated-image-${timestamp}.png`;
  const result = await uploadFile(filename, buffer);

  log.info(
    {
      mode,
      ms: Date.now() - startMs,
      imageUrl: result.url,
      uploadedFilename: filename,
    },
    "generateImage: success"
  );

  return { imageUrl: result.url, prompt };
}

export const generateImageTool = ({
  attachments = [],
  lastGeneratedImage = null,
}: GenerateImageProps = {}) =>
  tool({
    description: `Generate images from text descriptions. Can optionally use attached images as reference.

Use for:
- Create images, artwork, illustrations from descriptive prompts
- Generate visual content based on user requests
- Support various art styles and subjects
- Be as detailed as possible in the description
- Use attached images as visual reference when available`,
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "Detailed description of the image to generate. Include style, composition, colors, mood, and any other relevant details."
        ),
    }),
    execute: async ({ prompt }) => {
      const startMs = Date.now();
      const imageParts = attachments.filter(
        (part) => part.type === "file" && part.mediaType?.startsWith("image/")
      );

      const mode: ImageMode =
        imageParts.length > 0 || lastGeneratedImage !== null
          ? "edit"
          : "generate";

      log.info(
        {
          mode,
          attachmentCount: imageParts.length,
          hasLastGeneratedImage: lastGeneratedImage !== null,
          promptLength: prompt.length,
        },
        "generateImage: start"
      );

      try {
        return await runGenerateImage({
          mode,
          prompt,
          imageParts,
          lastGeneratedImage,
          startMs,
        });
      } catch (error) {
        log.error(
          {
            mode,
            ms: Date.now() - startMs,
            error: serializeError(error),
          },
          "generateImage: failure"
        );
        throw error;
      }
    },
  });
