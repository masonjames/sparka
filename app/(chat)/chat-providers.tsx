'use client';

import type { Session } from '@/lib/auth';
import { ChatIdProvider } from '@/providers/chat-id-provider';

import { ChatPrefetch } from '@/components/chat-prefetch';
import { AnonymousSessionInit } from '@/components/anonymous-session-init';

interface ChatProvidersProps {
  children: React.ReactNode;
  user: Session['user'];
}

export function ChatProviders({ children, user }: ChatProvidersProps) {
  return (
    <ChatIdProvider>
      <AnonymousSessionInit />
      <ChatPrefetch user={user} />
      {children}
    </ChatIdProvider>
  );
}
