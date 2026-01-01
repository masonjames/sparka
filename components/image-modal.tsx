"use client";

import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { CopyIcon, DownloadIcon } from "@/components/icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ImageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  showActions?: boolean;
};

async function handleCopyImage(
  e: React.MouseEvent,
  imageUrl: string | undefined
) {
  e.stopPropagation();
  if (!imageUrl) return;

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    toast.success("Copied image to clipboard!");
  } catch (_error) {
    toast.error("Failed to copy image to clipboard");
  }
}

async function handleDownload(
  e: React.MouseEvent,
  imageUrl: string | undefined
) {
  e.stopPropagation();
  if (!imageUrl) return;

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (_error) {
    toast.error("Failed to download image");
  }
}

export function ImageActions({
  className,
  imageUrl,
}: {
  className?: string;
  imageUrl: string | undefined;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        className={cn(
          "rounded-lg bg-black/50 p-2 hover:bg-black/70",
          "flex items-center gap-2 text-white"
        )}
        onClick={(e) => handleCopyImage(e, imageUrl)}
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
        onClick={(e) => handleDownload(e, imageUrl)}
        title="Download image"
        type="button"
      >
        <DownloadIcon size={16} />
      </button>
    </div>
  );
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  showActions = true,
}: ImageModalProps) {
  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent
        className="h-screen w-screen max-w-none rounded-none border-none bg-background/50 p-0 backdrop-blur-sm sm:max-w-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {imageName ?? "Image Preview"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {imageName ?? "Image preview"}
        </DialogDescription>
        <DialogClose className="absolute top-4 left-4 z-10 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20">
          <XIcon size={20} />
          <span className="sr-only">Close</span>
        </DialogClose>
        <button
          className="group flex h-full w-full items-center justify-center"
          onClick={() => onClose()}
          type="button"
        >
          {/* biome-ignore lint/performance/noImgElement: Next/Image not desired for modal preview */}
          <img
            alt={imageName ?? "Expanded image"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            src={imageUrl || undefined}
          />
          {showActions && (
            <ImageActions
              className="absolute top-4 right-4"
              imageUrl={imageUrl}
            />
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
}
