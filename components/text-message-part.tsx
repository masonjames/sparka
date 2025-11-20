"use client";

import { memo } from "react";
import { Response } from "./ai-elements/response";

export const TextMessagePart = memo(function TextMessagePart({
  messageId,
  partIdx,
}: {
  messageId: string;
  partIdx: number;
}) {
  return <Response />;
});
