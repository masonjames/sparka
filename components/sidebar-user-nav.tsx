'use client';
import { Coins } from 'lucide-react';
import Image from 'next/image';
import type { Session } from '@/lib/auth';
import authClient from '@/lib/auth-client';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useGetCredits } from '@/hooks/chat-sync-hooks';

export function HeaderUserNav({
  user,
}: { user: NonNullable<Session['user']> }) {
  const { setTheme, theme } = useTheme();
  const { credits } = useGetCredits();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open user menu"
        >
          <Image
            src={user.image ?? `https://avatar.vercel.sh/${user.email}`}
            alt={user.email ?? 'User Avatar'}
            width={24}
            height={24}
            className="rounded-full"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-56">
        <DropdownMenuItem disabled>
          <span className="font-medium">{user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <div className="flex items-center text-muted-foreground">
            <Coins className="size-4 mr-1" />
            <span>Credits: {credits ?? 'Loading...'}</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <button
            type="button"
            className="w-full cursor-pointer"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = '/';
            }}
          >
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
