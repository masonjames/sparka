'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { useSession } from '@/providers/session-provider';
import { HeaderActions } from '@/components/header-actions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu } from 'lucide-react';

function PureModelsHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const isAuthenticated = !!user;

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <header
      className={cn(
        'bg-background h-(--header-height) px-2 sm:px-3 flex items-center w-full gap-2 relative',
        className,
      )}
    >
      <Link href="/" className="py-2" aria-label="Sparka home">
        <span className="text-lg font-semibold hover:bg-muted rounded-md cursor-pointer flex items-center gap-2 h-9 px-2">
          <Image
            src="/icon.svg"
            alt="Sparka AI"
            width={24}
            height={24}
            className="size-6"
          />
          <span className="hidden sm:inline">Sparka</span>
        </span>
      </Link>

      <nav className="hidden sm:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
        <Link
          href="/"
          className={cn(
            'text-sm font-medium transition-colors hover:text-foreground',
            isActive('/') ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Chat
        </Link>
        <Link
          href="/models"
          className={cn(
            'text-sm font-medium transition-colors hover:text-foreground',
            isActive('/models') ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Models
        </Link>
        <Link
          // @ts-expect-error - Compare is a valid route
          href="/compare"
          className={cn(
            'text-sm font-medium transition-colors hover:text-foreground',
            isActive('/compare') ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          Compare
        </Link>
      </nav>

      {/* Right side: actions + mobile menu */}
      <div className="ml-auto flex items-center gap-1">
        <HeaderActions user={user} />
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              sideOffset={8}
              className="w-40"
            >
              <DropdownMenuItem asChild>
                <Link href="/" className={cn(isActive('/') && 'font-semibold')}>
                  Chat
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/models"
                  className={cn(isActive('/models') && 'font-semibold')}
                >
                  Models
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  // @ts-expect-error - Compare is a valid route
                  href="/compare"
                  className={cn(isActive('/compare') && 'font-semibold')}
                >
                  Compare
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export const ModelsHeader = memo(PureModelsHeader);
