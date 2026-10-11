"use client";

import type { JSX as ReactJSX } from "react";
import React, { useEffect, useState } from "react";

import { AttachmentList } from "@/components/attachment-list";
import type { ReadonlyEveMessagePart } from "@/lib/eve/readonly-message-types";

/* oxlint-disable typescript/strict-boolean-expressions -- EveAttachment: ; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including source?.startsWith("data:")). */

export const EveAttachment = ({
  part,
}: {
  readonly part: Extract<ReadonlyEveMessagePart, { readonly type: "file" }>;
}): ReactJSX.Element => {
  const [resolved, setResolved] = useState<{ source: string; url: string }>();
  const source = part.url;
  useEffect(() => {
    if (!source?.startsWith("data:")) {
      return;
    }
    let disposed = false;
    let objectUrl: string | undefined;
    // Browsers block top-level data URLs. Give the shared Open action a Blob URL.
    const resolveAttachment = async (): Promise<void> => {
      try {
        const response = await fetch(source);
        const blob = await response.blob();
        if (!disposed) {
          objectUrl = URL.createObjectURL(blob);
          setResolved({ source, url: objectUrl });
        }
      } catch {
        setResolved(undefined);
      }
    };
    void resolveAttachment();
    // oxlint-disable-next-line typescript/consistent-return -- #580: This effect returns cleanup only when it installed an active resource; inactive branches intentionally return nothing.
    return (): void => {
      disposed = true;
      if (typeof objectUrl === "string" && objectUrl !== "") {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [source]);
  let url = source;
  if (source?.startsWith("data:")) {
    url = resolved?.source === source ? resolved.url : undefined;
  }
  if (typeof url === "string" && url !== "") {
    return (
      <AttachmentList
        attachments={[
          {
            contentType: part.mediaType,
            name: part.filename ?? "Attachment",
            url,
          },
        ]}
      />
    );
  }
  return <p>{part.filename ?? "Attachment"}</p>;
};
/* oxlint-enable typescript/strict-boolean-expressions */
