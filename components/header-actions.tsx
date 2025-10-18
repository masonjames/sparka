'use client';

import { memo } from 'react';
import { useSession } from '@/providers/session-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Session } from '@/lib/auth';
import { GitIcon } from '@/components/icons';
import { LogIn } from 'lucide-react';
import { HeaderUserNav } from '@/components/sidebar-user-nav';

function PureHeaderActions({ user }: { user?: Session['user'] }) {
  const router = useRouter();
  const { data: session } = useSession();
  const effectiveUser = user ?? session?.user;
  const isAuthenticated = !!effectiveUser;

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="icon" asChild>
        <a
          href="https://github.com/franciscomoretti/sparka"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <GitIcon size={20} />
        </a>
      </Button>

      {isAuthenticated && effectiveUser ? (
        <HeaderUserNav user={effectiveUser} />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3"
              onClick={() => {
                router.push('/login');
                router.refresh();
              }}
            >
              <LogIn className="h-4 w-4 mr-2" />
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
