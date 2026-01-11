"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { parseChatIdFromPathname } from "@/providers/parse-chat-id-from-pathname";

export function useIsSharedRoute(): boolean {
  const pathname = usePathname();
  return useMemo(
    () => parseChatIdFromPathname(pathname).source === "share",
    [pathname]
  );
}
