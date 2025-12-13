"use client";

import { Suspense } from "react";
import { ChatPage } from "@/app/(chat)/chat/[id]/chat-page";

export function ChatPageRouter() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
