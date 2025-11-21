"use client";

import { GithubLogo } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { GoogleLogo } from "@phosphor-icons/react/dist/csr/GoogleLogo";
import { Button } from "@/components/ui/button";
import authClient from "@/lib/auth-client";
import { useConfig } from "./config-provider";

export function SocialAuthProviders() {
  const config = useConfig();
  return (
    <div className="space-y-2">
      {config.authentication.google ? (
        <Button
          className="w-full"
          onClick={() => authClient.signIn.social({ provider: "google" })}
          type="button"
          variant="outline"
        >
          <GoogleLogo className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>
      ) : null}
      {config.authentication.github ? (
        <Button
          className="w-full"
          onClick={() => authClient.signIn.social({ provider: "github" })}
          type="button"
          variant="outline"
        >
          <GithubLogo className="mr-2 h-4 w-4" />
          Continue with GitHub
        </Button>
      ) : null}
    </div>
  );
}
