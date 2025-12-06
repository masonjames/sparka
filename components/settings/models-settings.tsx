"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/react";
import { ModelsTable } from "./models-table";

export function ModelsSettings() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="relative flex shrink-0 gap-4">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
        <Input
          className="bg-muted/50 pr-10 pl-9"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search model"
          value={search}
        />
        <Button
          className=""
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: trpc.settings.getModelPreferences.queryKey(),
            })
          }
          size="icon"
          variant="ghost"
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <ModelsTable search={deferredSearch} />
      </div>
    </div>
  );
}
