"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useGetCredits } from "@/hooks/chat-sync-hooks";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session-provider";
import { Button } from "../ui/button";

const GHOST_PORTAL_URL = "https://masonjames.com/#/portal";

const VARIANT_CONFIG: Record<
  "credits" | "model" | "image",
  {
    dismissible: boolean;
    getMessage: ({
      remaining,
      isAtLimit,
      isAuthenticated,
    }: {
      remaining: number;
      isAtLimit: boolean;
      isAuthenticated: boolean;
    }) => React.ReactNode;
    getClasses: ({ isAtLimit }: { isAtLimit: boolean }) => string;
  }
> = {
  credits: {
    dismissible: true,
    getMessage: ({ remaining, isAtLimit, isAuthenticated }) => {
      // For authenticated users, show upgrade to subscriber plan
      if (isAuthenticated) {
        if (isAtLimit) {
          return (
            <span>
              You&apos;ve used all your credits.{" "}
              <a
                className="font-medium text-red-700 underline hover:no-underline dark:text-red-300"
                href={GHOST_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Subscribe for 10,000 credits/month
              </a>
            </span>
          );
        }
        if (remaining <= 10) {
          return (
            <span>
              You only have{" "}
              <strong>
                {remaining} credit{remaining !== 1 ? "s" : ""}
              </strong>{" "}
              left.{" "}
              <a
                className="font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
                href={GHOST_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Upgrade to Pro for 10,000/month
              </a>
            </span>
          );
        }
      }
      
      // For anonymous users, show login prompt
      return isAtLimit ? (
        <span>
          You&apos;ve reached your credit limit.{" "}
          <Link
            className="font-medium text-red-700 underline hover:no-underline dark:text-red-300"
            href="/login"
          >
            Sign in to continue
          </Link>
        </span>
      ) : (
        <span>
          You only have{" "}
          <strong>
            {remaining} credit{remaining !== 1 ? "s" : ""}
          </strong>{" "}
          left.{" "}
          <Link
            className="font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
            href="/login"
          >
            Sign in for more
          </Link>
        </span>
      );
    },
    getClasses: ({ isAtLimit }) =>
      isAtLimit
        ? "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200"
        : "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200",
  },
  model: {
    dismissible: false,
    getMessage: () => (
      <span>
        This model isn&apos;t available for anonymous users.{" "}
        <Link
          className="font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
          href="/login"
        >
          Log in to use this model
        </Link>
      </span>
    ),
    getClasses: () =>
      "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200",
  },
  image: {
    dismissible: false,
    getMessage: () => <span>Image models are not supported here yet.</span>,
    getClasses: () =>
      "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200",
  },
};

export function LimitDisplay({
  className,
  forceVariant,
}: {
  className?: string;
  forceVariant?: "credits" | "model" | "image";
}) {
  const { credits, isLoadingCredits } = useGetCredits();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [dismissed, setDismissed] = useState(false);

  const variant = forceVariant ?? "credits";
  const config = VARIANT_CONFIG[variant];

  // Credits variant relies on credits API state
  if (variant === "credits" && isLoadingCredits) {
    return null;
  }

  // Don't show if dismissed
  if (config.dismissible && dismissed) {
    return null;
  }

  const remaining = credits ?? 0;

  // Only show when approaching or at limit (credits variant)
  const isAtLimit = remaining <= 0;
  
  // For anonymous users, hide when not approaching limit
  if (!isAuthenticated && variant === "credits" && remaining > 10 && !isAtLimit) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1, height: "auto" }}
        className={cn("w-full", className)}
        exit={{ opacity: 0, height: 0 }}
        initial={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm",
            config.getClasses({ isAtLimit })
          )}
        >
          <div className="flex-1">
            {config.getMessage({ remaining, isAtLimit, isAuthenticated })}
          </div>
          {config.dismissible ? (
            <Button
              className="h-6 w-6 p-0 hover:bg-transparent"
              onClick={() => setDismissed(true)}
              size="sm"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
