"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useSyncExternalStore } from "react";
import type { JSX as ReactJSX } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import type { ReadonlyNativeSurface } from "@/lib/readonly-native-surface";
import { useTRPC } from "@/trpc/react";

import { EveSearchResultsView } from "./eve-search-results-view";
import { useDebouncedSearch } from "./use-debounced-search";

const SearchResults = ({
  onSelect,
  onClose,
  ownerId,
}: {
  readonly onSelect: (id: string) => void;
  readonly onClose: () => void;
  readonly ownerId: string;
}): ReactJSX.Element => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const search = useDebouncedSearch(query);
  const history = useInfiniteQuery(
    trpc.eve.list.infiniteQueryOptions(
      { ownerScope: ownerId },
      {
        enabled: !query.trim(),
        getNextPageParam: (page: {
          readonly nextCursor: {
            readonly isPinned: boolean;
            readonly updatedAt: string;
            readonly id: string;
          } | null;
        }) => page.nextCursor,
        refetchOnWindowFocus: false,
        staleTime: 0,
      }
    )
  );
  const results = useInfiniteQuery(
    trpc.eve.search.infiniteQueryOptions(
      { ownerScope: ownerId, search },
      {
        enabled: Boolean(search) && search === query.trim(),
        getNextPageParam: (page: {
          readonly nextCursor: {
            readonly rank: number;
            readonly updatedAt: string;
            readonly id: string;
          } | null;
        }) => page.nextCursor,
        refetchOnWindowFocus: false,
        staleTime: 0,
        trpc: { abortOnUnmount: true },
      }
    )
  );
  const isSearch = Boolean(query.trim());
  const active = isSearch ? results : history;
  const changingQuery = query.trim() !== search;
  const waiting =
    changingQuery ||
    active.isPending ||
    (active.isFetching && !active.isFetchingNextPage);
  const failed = !changingQuery && active.isError;
  const recentItems =
    history.data?.pages
      .flatMap(
        (
          page: ReadonlyNativeSurface<
            NonNullable<typeof history.data>["pages"][number]
          >
        ) => page.items
      )
      .filter(
        (item: {
          readonly state: "creating" | "bound" | "uncertain" | "deleting";
        }) => item.state === "bound"
      )
      .map(
        (
          item: ReadonlyNativeSurface<
            NonNullable<typeof history.data>["pages"][number]["items"][number]
          >
        ) => ({
          ...item,
          conversationId: item.conversationId ?? item.id,
          excerpt: "",
        })
      ) ?? [];
  const matchedItems =
    results.data?.pages.flatMap(
      (
        page: ReadonlyNativeSurface<
          NonNullable<typeof results.data>["pages"][number]
        >
      ) => page.items
    ) ?? [];
  const currentItems = isSearch ? matchedItems : recentItems;
  const items = waiting || failed ? [] : currentItems;
  const seen = new Set<string>();
  const distinct = items.filter((item: { readonly id: string }) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
  return (
    <EveSearchResultsView
      onClose={onClose}
      query={query}
      onQueryChange={(value) => {
        if (value.trim() !== query.trim()) {
          // Cancel immediately, not after the debounce: an old response must
          // never publish while the user is already typing a different query.
          void queryClient.cancelQueries({
            exact: true,
            queryKey: trpc.eve.search.infiniteQueryKey({
              ownerScope: ownerId,
              search,
            }),
          });
        }
        setQuery(value);
      }}
      searching={waiting}
      pending={waiting && !failed}
      error={failed}
      items={distinct}
      isSearch={isSearch}
      onSelect={onSelect}

      onRetry={() => {
        void active.refetch();
      }}
      hasMore={!waiting && !failed && active.hasNextPage}
      loadingMore={active.isFetchingNextPage}

      onLoadMore={() => {
        void active.fetchNextPage();
      }}
      disableLoadMore={active.isFetching || changingQuery}
    />
  );
};

const searchShortcut = () => {
  if (navigator.platform.toUpperCase().includes("MAC")) {
    return "Cmd+K";
  }
  return "Ctrl+K";
};

const unsubscribePlatform = (): null => null;
const subscribePlatform = () => unsubscribePlatform;

const serverShortcut = (): string => "Ctrl+K";

/* oxlint-disable typescript/strict-boolean-expressions -- EveSearchChats: ; max-lines-per-function: keep this cohesive render, state lifecycle, or integration scenario together; extraction needs a separate ownership decision; react-perf/jsx-no-new-function-as-prop: this event callback captures current render state; memoization requires a separately verified dependency contract; react/jsx-max-depth: the existing accessible component hierarchy preserves layout, provider, and interaction boundaries; react/no-multi-comp: these related render helpers share this feature module and its local state and props contract; typescript/explicit-function-return-type: preserve contextual callback and hook inference without widening this existing generic or state-dependent result; typescript/explicit-module-boundary-types: preserve the existing inferred hook or component API, including callback and generic result relationships; typescript/strict-boolean-expressions: the existing empty, missing, or optional value deliberately selects this feature fallback (including ownerId). */

export const EveSearchChats = ({
  ownerId,
}: {
  readonly ownerId?: string;
}): ReactJSX.Element => {
  const shortcut = useSyncExternalStore(
    subscribePlatform,
    searchShortcut,
    serverShortcut
  );
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    const down = (
      event: Readonly<
        Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "preventDefault">
      >
    ): void => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", down);
    return (): void => {
      document.removeEventListener("keydown", down);
    };
  }, []);
  return (
    <>
      <SidebarMenuButton
        tooltip="Search chats"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SearchIcon className="size-4" />
        <span>Search chats</span>
        <span className="text-muted-foreground ml-auto text-xs">
          {shortcut}
        </span>
      </SidebarMenuButton>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="overflow-hidden p-0"
          showCloseButton={!ownerId}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search chats</DialogTitle>
            <DialogDescription>
              Search your conversation history.
            </DialogDescription>
          </DialogHeader>
          {open && !ownerId && (
            <p className="text-muted-foreground p-4 text-sm">
              Start a chat to see your conversation history.
            </p>
          )}
          {open && ownerId && (
            <SearchResults
              key={ownerId}
              ownerId={ownerId}
              onClose={() => {
                setOpen(false);
              }}
              onSelect={(id) => {
                setOpen(false);
                setOpenMobile(false);
                router.push(`/chat/${id}`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
/* oxlint-enable typescript/strict-boolean-expressions */
