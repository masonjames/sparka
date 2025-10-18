import { ModelsHeader } from './models-header';
import { auth } from '../../lib/auth';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { allModels, providers } from '@/lib/models';
import { TRPCReactProvider } from '@/trpc/react';
import { SessionProvider } from '@/providers/session-provider';

const totalModels = allModels.length;
const totalProviders = providers.length;

const pageTitle = `Models | Sparka AI`;
const pageDescription = `Browse ${totalModels} models across ${totalProviders} providers from Vercel AI Gateway in Sparka AI. Filter and compare by provider, context window, and pricing.`;

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  keywords: [
    'Sparka',
    'Vercel AI Gateway',
    'models',
    'LLM',
    'AI models',
    'providers',
  ],
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: '/models',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle,
    description: pageDescription,
  },
  alternates: {
    canonical: '/models',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const HEADER_HEIGHT = '2.75rem';

export default async function ModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await auth.api.getSession({ headers: await headers() });
  const session = raw
    ? {
        user: raw.user
          ? {
              id: raw.user.id,
              name: raw.user.name ?? null,
              email: raw.user.email ?? null,
              image: raw.user.image ?? null,
            }
          : undefined,
        expires: raw.session?.expiresAt
          ? new Date(raw.session.expiresAt).toISOString()
          : undefined,
      }
    : undefined;
  return (
    <TRPCReactProvider>
      <SessionProvider initialSession={session}>
        <div
          className="h-dvh max-h-dvh grid grid-rows-[auto_1fr]"
          style={
            {
              '--header-height': HEADER_HEIGHT,
            } as React.CSSProperties
          }
        >
          <ModelsHeader />
          <div className="relative flex-1 min-h-0 ">{children}</div>
        </div>
      </SessionProvider>
    </TRPCReactProvider>
  );
}
