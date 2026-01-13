import { type FileUIPart, generateImage, generateText, tool } from "ai";
import { z } from "zod";
import { DEFAULT_IMAGE_MODEL } from "@/lib/ai/app-models";
import { getImageModel, getMultimodalImageModel } from "@/lib/ai/providers";
import { uploadFile } from "@/lib/blob";
import { createModuleLogger } from "@/lib/logger";
import {
  type AnyImageModelId,
  isMultimodalImageModel,
} from "@/lib/models/image-model-id";

type GenerateImageProps = {
  attachments?: FileUIPart[];
  lastGeneratedImage?: { imageUrl: string; name: string } | null;
  modelId?: AnyImageModelId;
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
  raw?: unknown;
} {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }

  // Handle Promise-like objects (shouldn't happen but does sometimes)
  if (err && typeof err === "object" && "then" in err) {
    return { message: "Error was a Promise - check raw", raw: err };
  }

  // Handle objects with message property
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { message: unknown; name?: unknown };
    return {
      message: String(e.message),
      name: e.name ? String(e.name) : undefined,
    };
  }

  return { message: String(err), raw: err };
}

async function resolveError(error: unknown): Promise<unknown> {
  if (error && typeof error === "object" && "then" in error) {
    return await (error as Promise<unknown>).catch((e) => e);
  }
  return error;
}

function getErrorDebugInfo(err: unknown) {
  return {
    errorType: typeof err,
    errorConstructor: (err as { constructor?: { name?: string } })?.constructor
      ?.name,
    errorKeys: err && typeof err === "object" ? Object.keys(err) : [],
  };
}

async function runGenerateImageTraditional({
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
    model: getImageModel(DEFAULT_IMAGE_MODEL),
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

async function runGenerateImageMultimodal({
  modelId,
  mode,
  prompt,
  imageParts,
  lastGeneratedImage,
  startMs,
}: {
  modelId: AnyImageModelId;
  mode: ImageMode;
  prompt: string;
  imageParts: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  startMs: number;
}): Promise<{ imageUrl: string; prompt: string }> {
  if (!isMultimodalImageModel(modelId)) {
    throw new Error(`Model ${modelId} is not a multimodal image model`);
  }

  // Build messages with image context if in edit mode
  type ImageContent = { type: "image"; image: URL };
  type TextContent = { type: "text"; text: string };
  const userContent: Array<TextContent | ImageContent> = [];

  // Add reference images if in edit mode
  if (mode === "edit") {
    if (lastGeneratedImage) {
      userContent.push({
        type: "image",
        image: new URL(lastGeneratedImage.imageUrl),
      });
    }
    for (const part of imageParts) {
      userContent.push({ type: "image", image: new URL(part.url) });
    }
  }

  // Add the prompt with instruction to generate image
  userContent.push({
    type: "text",
    text:
      mode === "edit"
        ? `Based on the provided image(s), ${prompt}`
        : `Generate an image: ${prompt}`,
  });

  log.debug(
    {
      modelId,
      mode,
      imageCount: userContent.filter((c) => c.type === "image").length,
    },
    "generateImage: using multimodal model"
  );

  const res = await generateText({
    model: getMultimodalImageModel(modelId),
    messages: [{ role: "user", content: userContent }],
    providerOptions: {
      google: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
  });

  // Find the first image in the response files
  const imageFile = res.files?.find((f) => f.mediaType.startsWith("image/"));
  if (!imageFile) {
    throw new Error("No image generated by multimodal model");
  }

  log.debug(
    {
      mode,
      mediaType: imageFile.mediaType,
      hasBase64: !!imageFile.base64,
    },
    "generateImage: multimodal response received"
  );

  const buffer = Buffer.from(imageFile.uint8Array);
  const timestamp = Date.now();
  const ext = imageFile.mediaType.split("/")[1] || "png";
  const filename = `generated-image-${timestamp}.${ext}`;
  const result = await uploadFile(filename, buffer);

  log.info(
    {
      mode,
      modelId,
      ms: Date.now() - startMs,
      imageUrl: result.url,
      uploadedFilename: filename,
    },
    "generateImage: multimodal success"
  );

  return { imageUrl: result.url, prompt };
}

export const generateImageTool = ({
  attachments = [],
  lastGeneratedImage = null,
  modelId,
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
          modelId,
          attachmentCount: imageParts.length,
          hasLastGeneratedImage: lastGeneratedImage !== null,
          promptLength: prompt.length,
        },
        "generateImage: start"
      );

      try {
        // Use multimodal path for language models with image generation
        if (modelId && isMultimodalImageModel(modelId)) {
          return await runGenerateImageMultimodal({
            modelId,
            mode,
            prompt,
            imageParts,
            lastGeneratedImage,
            startMs,
          });
        }

        // Default: traditional image generation
        return await runGenerateImageTraditional({
          mode,
          prompt,
          imageParts,
          lastGeneratedImage,
          startMs,
        });
      } catch (error) {
        const resolvedError = await resolveError(error);
        log.error(
          {
            mode,
            modelId,
            ms: Date.now() - startMs,
            error: serializeError(resolvedError),
            ...getErrorDebugInfo(resolvedError),
          },
          "generateImage: failure"
        );
        throw resolvedError;
      }
    },
  });
