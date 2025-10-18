import { TRPCReactProvider } from '@/trpc/react';
import { SessionProvider } from '@/providers/session-provider';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export default async function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <SessionProvider initialSession={session ?? undefined}>
      <TRPCReactProvider>{children}</TRPCReactProvider>
    </SessionProvider>
  );
}
