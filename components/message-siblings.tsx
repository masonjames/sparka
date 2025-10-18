import { memo } from 'react';
import { useSession } from '@/providers/session-provider';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Action } from '@/components/ai-elements/actions';
import { useMessageTree } from '@/providers/message-tree-provider';
import { useMessageById, useMessageRoleById } from '@/lib/stores/hooks';

export function PureMessageSiblings({
  messageId,
  isReadOnly,
}: {
  messageId: string;
  isReadOnly: boolean;
}) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const { getMessageSiblingInfo, navigateToSibling } = useMessageTree();
  const siblingInfo = getMessageSiblingInfo(messageId);
  const hasSiblings = siblingInfo && siblingInfo.siblings.length > 1;

  const role = useMessageRoleById(messageId);
  const message = useMessageById(messageId);

  return (
    <div className="flex gap-1 items-center justify-center">
      {hasSiblings && (
        <>
          <Action
            tooltip="Previous version"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 px-0"
            onClick={() => navigateToSibling(messageId, 'prev')}
            disabled={siblingInfo.siblingIndex === 0}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Action>

          <span className="text-muted-foreground text-xs">
            {siblingInfo.siblingIndex + 1}/{siblingInfo.siblings.length}
          </span>

          <Action
            tooltip="Next version"
            className="text-muted-foreground hover:text-accent-foreground hover:bg-accent h-7 w-7 px-0"
            onClick={() => navigateToSibling(messageId, 'next')}
            disabled={
              siblingInfo.siblingIndex === siblingInfo.siblings.length - 1
            }
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Action>
        </>
      )}
    </div>
  );
}

export const MessageSiblings = memo(PureMessageSiblings);
