import { experimental_generateVideo as generateVideo, tool } from "ai";
import { z } from "zod";
import { getVideoModel } from "@/lib/ai/providers";
import { uploadFile } from "@/lib/blob";
import { config } from "@/lib/config";
import type { CostAccumulator } from "@/lib/credits/cost-accumulator";
import { createModuleLogger } from "@/lib/logger";
import { toolsDefinitions } from "./tools-definitions";

type GenerateVideoProps = {
  costAccumulator?: CostAccumulator;
};

const log = createModuleLogger("ai.tools.generate-video");

export const generateVideoTool = ({
  costAccumulator,
}: GenerateVideoProps = {}) =>
  tool({
    description:
      "Generate a short video clip from a text prompt. Use this when the user asks to create, make, or generate a video.",
    inputSchema: z.object({
      prompt: z
        .string()
        .describe("A descriptive prompt for the video to generate."),
    }),
    execute: async ({ prompt }) => {
      const startMs = Date.now();

      log.info(
        { promptLength: prompt.length },
        "generateVideo: start"
      );

      try {
        const modelId = config.models.defaults.video;
        const result = await generateVideo({
          model: getVideoModel(modelId),
          prompt,
          aspectRatio: "16:9",
          duration: 5,
        });

        const video = result.video;
        if (!video) {
          throw new Error("No video generated");
        }

        const buffer = Buffer.from(video.uint8Array);
        const timestamp = Date.now();
        const ext =
          video.mediaType?.split("/")[1]?.replace("quicktime", "mov") || "mp4";
        const filename = `generated-video-${timestamp}.${ext}`;
        const uploaded = await uploadFile(filename, buffer);

        costAccumulator?.addAPICost(
          "generateVideo",
          toolsDefinitions.generateVideo.cost
        );

        log.info(
          {
            ms: Date.now() - startMs,
            videoUrl: uploaded.url,
          },
          "generateVideo: success"
        );

        return { videoUrl: uploaded.url, prompt };
      } catch (error) {
        log.error(
          {
            ms: Date.now() - startMs,
            error:
              error instanceof Error
                ? { message: error.message, name: error.name }
                : error,
          },
          "generateVideo: failure"
        );
        throw error;
      }
    },
  });
