"use client";

import type React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ImageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
};

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  imageName,
}: ImageModalProps) {
  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent>
        <button
          className="max-h-[90vh] max-w-full cursor-default rounded-lg border-none bg-transparent object-contain p-0"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
            }
          }}
          type="button"
        >
          {/* biome-ignore lint/performance/noImgElement: Next/Image not desired for modal preview */}
          <img
            alt={imageName ?? "Expanded image"}
            height={1000}
            src={imageUrl || undefined}
            width={1000}
          />
        </button>
      </DialogContent>
    </Dialog>
  );
}
