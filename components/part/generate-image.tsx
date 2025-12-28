"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon } from "@/components/icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import type { ChatMessage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export type GenerateImageTool = Extract<
  ChatMessage["parts"][number],
  { type: "tool-generateImage" }
>;

export function GenerateImage({ tool }: { tool: GenerateImageTool }) {
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!output.imageUrl) {
      return;
    }

    try {
      const response = await fetch(output.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_error) {
      toast.error("Failed to download image");
    }
  };

  const ImageActions = ({ className }: { className?: string }) => (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        className={cn(
          "rounded-lg bg-black/50 p-2 hover:bg-black/70",
          "flex items-center gap-2 text-white"
        )}
        onClick={handleCopyImage}
        title="Copy image"
        type="button"
      >
        <CopyIcon size={16} />
      </button>
      <button
        className={cn(
          "rounded-lg bg-black/50 p-2 hover:bg-black/70",
          "flex items-center gap-2 text-white"
        )}
        onClick={handleDownload}
        title="Download image"
        type="button"
      >
        <DownloadIcon size={16} />
      </button>
    </div>
  );

  return (
    <>
      <div className="flex w-full flex-col gap-4 overflow-hidden rounded-lg border">
        <button
          className="group relative cursor-pointer text-left"
          onClick={() => setDialogOpen(true)}
          type="button"
        >
          {/* biome-ignore lint/performance/noImgElement: Next/Image isn't desired for dynamic external URLs here */}
          <img
            alt={output.prompt}
            className="h-auto w-full max-w-full"
            height={512}
            src={output.imageUrl}
            width={512}
          />
          <ImageActions className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <div className="p-4 pt-0">
          <p className="text-muted-foreground text-sm">
            Generated from: &quot;{output.prompt}&quot;
          </p>
        </div>
      </div>

      <Dialog onOpenChange={setDialogOpen} open={dialogOpen}>
        <DialogContent
          className="h-screen w-screen max-w-none border-none bg-background/50 backdrop-blur-sm p-0 sm:max-w-none rounded-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Generated Image</DialogTitle>
          <DialogDescription className="sr-only">
            {output.prompt}
          </DialogDescription>
          <DialogClose className="absolute top-4 left-4 z-10 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
            <XIcon size={20} />
            <span className="sr-only">Close</span>
          </DialogClose>
          <button
            className="group flex h-full w-full items-center justify-center"
            onClick={() => setDialogOpen(false)}
            type="button"
          >
            {/* biome-ignore lint/performance/noImgElement: Next/Image isn't desired for dynamic external URLs here */}
            <img
              alt={output.prompt}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
              src={output.imageUrl}
            />
            <ImageActions className="absolute top-4 right-4" />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
