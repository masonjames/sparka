'use client';

import { Button } from '@/components/ui/button';
import authClient from '@/lib/auth-client';
import { GoogleLogo, GithubLogo } from '@phosphor-icons/react';

export function SocialAuthProviders() {
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        type="button"
        onClick={() => authClient.signIn.social({ provider: 'google' })}
        className="w-full"
      >
        <GoogleLogo className="mr-2 h-4 w-4" />
        Continue with Google
      </Button>
      <Button
        variant="outline"
        type="button"
        onClick={() => authClient.signIn.social({ provider: 'github' })}
        className="w-full"
      >
        <GithubLogo className="mr-2 h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
