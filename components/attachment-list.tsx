"use client";

import {
  Download,
  ExternalLink,
  FileTextIcon,
  Loader2Icon,
  PaperclipIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import {
  PromptInputHoverCard,
  PromptInputHoverCardContent,
} from "@/components/ai-elements/prompt-input";
import { AttachmentCard } from "@/components/attachment-card";
import { Button } from "@/components/ui/button";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import type { Attachment } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

function AttachmentIcon({
  isImage,
  isPdf,
  url,
  name,
}: {
  isImage: boolean;
  isPdf: boolean;
  url: string;
  name: string;
}) {
  if (isImage) {
    return (
      <Image
        alt={name || "attachment"}
        className="size-5 object-cover"
        height={20}
        src={url}
        width={20}
      />
    );
  }

  if (isPdf) {
    return <FileTextIcon className="size-3 text-red-500" />;
  }

  return <PaperclipIcon className="size-3 text-muted-foreground" />;
}

function AttachmentPill({
  attachment,
  isUploading,
  onRemove,
}: {
  attachment: Attachment;
  isUploading: boolean;
  onRemove?: () => void;
}) {
  const { name, url, contentType } = attachment;
  const isImage = Boolean(contentType?.startsWith("image/") && url);
  const isPdf = contentType === "application/pdf";
  const attachmentLabel = name || (isImage ? "Image" : "Attachment");

  return (
    <div
      className={cn(
        "group relative flex h-8 cursor-default select-none items-center gap-1.5 rounded-md border border-border px-1.5 font-medium text-sm transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        isUploading && "opacity-60"
      )}
      data-testid="input-attachment-preview"
    >
      <div className="relative size-5 shrink-0">
        <div
          className={cn(
            "absolute inset-0 flex size-5 items-center justify-center overflow-hidden rounded bg-background transition-opacity",
            onRemove && !isUploading && "group-hover:opacity-0"
          )}
        >
          {isUploading ? (
            <Loader2Icon
              className="size-3 animate-spin text-muted-foreground"
              data-testid="input-attachment-loader"
            />
          ) : (
            <AttachmentIcon
              isImage={isImage}
              isPdf={isPdf}
              name={name}
              url={url}
            />
          )}
        </div>
        {onRemove && !isUploading && (
          <Button
            aria-label="Remove attachment"
            className="absolute inset-0 size-5 cursor-pointer rounded p-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 [&>svg]:size-2.5"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            type="button"
            variant="ghost"
          >
            <XIcon />
            <span className="sr-only">Remove</span>
          </Button>
        )}
      </div>

      <span className="max-w-24 flex-1 truncate">{attachmentLabel}</span>
    </div>
  );
}

function AttachmentItem({
  attachment,
  isUploading = false,
  onRemove,
  onImageClickAction,
  variant = "card",
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
  onImageClickAction?: (imageUrl: string, imageName?: string) => void;
  variant?: "card" | "pill";
}) {
  const { name, url, contentType } = attachment;
  const isImage = Boolean(contentType?.startsWith("image/") && url);
  const isPdf = contentType === "application/pdf";
  const attachmentLabel = name || (isImage ? "Image" : "Attachment");

  const preview =
    variant === "pill" ? (
      <AttachmentPill
        attachment={attachment}
        isUploading={isUploading}
        onRemove={onRemove}
      />
    ) : (
      <AttachmentCard
        attachment={attachment}
        isUploading={isUploading}
        onRemove={onRemove}
      />
    );

  // For uploading items or items without URL, just return the preview
  if (isUploading || !url) {
    return preview;
  }

  return (
    <PromptInputHoverCard>
      <HoverCardTrigger
        asChild
        onClick={() => isImage && onImageClickAction?.(url, name)}
      >
        {preview}
      </HoverCardTrigger>
      <PromptInputHoverCardContent className="w-auto p-2">
        <div className="w-auto space-y-3">
          {isImage && (
            <div className="relative flex h-96 w-96 items-center justify-center overflow-hidden rounded-md border">
              <Image
                alt={name || "attachment preview"}
                className="object-contain"
                fill
                sizes="384px"
                src={url}
              />
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1 space-y-1 px-0.5">
              <h4 className="truncate font-semibold text-sm leading-none">
                {attachmentLabel}
              </h4>
              {contentType && (
                <p className="truncate font-mono text-muted-foreground text-xs">
                  {contentType}
                </p>
              )}
            </div>
            {isPdf && (
              <div className="flex gap-1">
                <Button
                  className="size-7"
                  onClick={() => window.open(url, "_blank")}
                  size="icon"
                  title="Open PDF"
                  variant="ghost"
                >
                  <ExternalLink className="size-3.5" />
                </Button>
                <Button
                  className="size-7"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = name || "document.pdf";
                    link.click();
                  }}
                  size="icon"
                  title="Download PDF"
                  variant="ghost"
                >
                  <Download className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </PromptInputHoverCardContent>
    </PromptInputHoverCard>
  );
}

export function AttachmentList({
  attachments,
  uploadQueue = [],
  onRemoveAction,
  onImageClickAction,
  variant = "card",
  testId = "attachments",
  className,
}: {
  attachments: Attachment[];
  uploadQueue?: string[];
  onRemoveAction?: (attachment: Attachment) => void;
  onImageClickAction?: (imageUrl: string, imageName?: string) => void;
  variant?: "card" | "pill";
  testId?: string;
  className?: string;
}) {
  if (attachments.length === 0 && uploadQueue.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-row flex-wrap items-end gap-2", className)}
      data-testid={testId}
    >
      {attachments.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.url}
          onImageClickAction={onImageClickAction}
          onRemove={
            onRemoveAction ? () => onRemoveAction(attachment) : undefined
          }
          variant={variant}
        />
      ))}

      {uploadQueue.map((filename) => (
        <AttachmentItem
          attachment={{
            url: "",
            name: filename,
            contentType: "",
          }}
          isUploading={true}
          key={filename}
          variant={variant}
        />
      ))}
    </div>
  );
}
