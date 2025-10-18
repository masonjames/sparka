import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SubscriptionPageClient } from './subscription-page-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscription - Sparka AI',
  description: 'Manage your Sparka AI subscription',
};

export default async function SubscriptionPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect('/login');
  }

  return <SubscriptionPageClient />;
}
