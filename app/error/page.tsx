import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Something went wrong | Chat by Mason James",
  description:
    "We couldn't finish signing you in. Try again or contact the Mason James team.",
};

const errorCopy: Record<string, string> = {
  invalid_origin:
    "We blocked a sign-in attempt because it came from an untrusted origin. Refresh the page or relaunch the link from your email.",
  state_mismatch:
    "Your session expired before we finished verifying the magic link. Request a new link and try again.",
  please_restart_the_process:
    "That sign-in link is no longer valid. Request a fresh link and open it right away.",
};

type ErrorPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const errorCode = (searchParams?.error || "unknown_error").toLowerCase();
  const message =
    errorCopy[errorCode] ||
    "We couldn't complete your sign-in. Request a new magic link or try another method.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          ⚠️
        </div>
        <h1 className="font-semibold text-2xl tracking-tight">We hit a snag</h1>
        <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
          {message}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className={cn(buttonVariants({ variant: "default" }), "flex-1")}
            href="/login"
          >
            Try again
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
            href="mailto:support@masonjames.com"
          >
            Contact support
          </Link>
        </div>
        <p className="mt-6 text-muted-foreground text-xs">
          Error code: <span className="font-mono">{errorCode}</span>
        </p>
      </div>
    </div>
  );
}
