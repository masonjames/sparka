'use client';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ShareButton } from './share-button';
import { Share } from 'lucide-react';
import type { Session } from '@/lib/auth';
import { HeaderActions } from '@/components/header-actions';

function PureChatHeader({
  chatId,
  isReadonly,
  hasMessages,
  user,
}: {
  chatId: string;
  isReadonly: boolean;
  hasMessages: boolean;
  user: Session['user'];
}) {
  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 justify-between h-(--header-height)">
      <div className="flex items-center gap-2">
        <SidebarToggle />

        {!isReadonly && hasMessages && <ShareButton chatId={chatId} />}
        {isReadonly && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-muted-foreground text-sm">
                <Share size={14} className="opacity-70" />
                <span>Shared</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <div className="font-medium">Shared Chat</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This is a shared chat
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <HeaderActions user={user} />
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.hasMessages === nextProps.hasMessages;
});
