"use client";

import { toast } from "sonner";
import { CopyIcon } from "@/components/icons";
import type { ChatMessage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export type GenerateImageTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-generateImage" }
>;

export function GeneratedImage({ tool }: { tool: GenerateImageTool }) {
  if (tool.state === "input-available") {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 rounded-lg border p-8">
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted-foreground/20" />
        <div className="text-muted-foreground">
          Generating image: &quot;{tool.input.prompt}&quot;
        </div>
      </div>
    );
  }
  const output = tool.output;
  if (!output) {
    return null;
  }

  const handleCopyImage = async () => {
    if (!output.imageUrl) {
      return;
    }

    try {
      const response = await fetch(output.imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success("Copied image to clipboard!");
    } catch (_error) {
      toast.error("Failed to copy image to clipboard");
    }
  };

  return (
    <div className="flex w-full flex-col gap-4 overflow-hidden rounded-lg border">
      <div className="group relative">
        {/* biome-ignore lint/performance/noImgElement: Next/Image isn't desired for dynamic external URLs here */}
        <img
          alt={output.prompt}
          className="h-auto w-full max-w-full"
          height={512}
          src={output.imageUrl}
          width={512}
        />
        <button
          className={cn(
            "absolute top-2 right-2 rounded-lg bg-black/50 p-2 hover:bg-black/70",
            "opacity-0 transition-opacity group-hover:opacity-100",
            "flex items-center gap-2 text-white"
          )}
          onClick={handleCopyImage}
          type="button"
        >
          <CopyIcon size={16} />
        </button>
      </div>
      <div className="p-4 pt-0">
        <p className="text-muted-foreground text-sm">
          Generated from: &quot;{output.prompt}&quot;
        </p>
      </div>
    </div>
  );
}
