"use client";

import { motion } from "motion/react";
import { PromptInputHeader } from "@/components/ai-elements/prompt-input";
import { AttachmentList } from "@/components/attachment-list";
import type { Attachment } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export function ContextBar({
  attachments,
  uploadQueue,
  onRemove,
  onImageClick,
  className,
}: {
  attachments: Attachment[];
  uploadQueue: string[];
  onRemove: (attachment: Attachment) => void;
  onImageClick: (url: string, name?: string) => void;
  className?: string;
}) {
  const hasBarContent = attachments.length > 0 || uploadQueue.length > 0;

  return (
    <motion.div
      animate={{
        height: hasBarContent ? "auto" : 0,
        opacity: hasBarContent ? 1 : 0,
      }}
      className={cn(className)}
      style={{ overflow: "hidden" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <PromptInputHeader className="w-full border-b bg-muted">
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <AttachmentList
            attachments={attachments}
            onImageClick={onImageClick}
            onRemove={onRemove}
            testId="attachments-preview"
            uploadQueue={uploadQueue}
          />
        )}
      </PromptInputHeader>
    </motion.div>
  );
}
