"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { GitIcon } from "@/components/icons";
import { HeaderUserNav } from "@/components/sidebar-user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Session } from "@/lib/auth";
import { useSession } from "@/providers/session-provider";

function PureHeaderActions({ user }: { user?: Session["user"] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const effectiveUser = user ?? session?.user;
  const isAuthenticated = !!effectiveUser;

  return (
    <div className="flex items-center gap-2">
      <Button asChild size="icon" type="button" variant="ghost">
        <a
          className="flex items-center justify-center"
          href="https://github.com/franciscomoretti/sparka"
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitIcon size={20} />
        </a>
      </Button>
      <ThemeToggle />

      {isAuthenticated && effectiveUser ? (
        <HeaderUserNav user={effectiveUser} />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-8 px-3"
              onClick={() => {
                router.push("/login");
                router.refresh();
              }}
              size="sm"
              variant="outline"
            >
              <LogIn className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sign in to your account</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export const HeaderActions = memo(PureHeaderActions);
