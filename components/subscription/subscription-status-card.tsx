'use client';

import { format } from 'date-fns';
import { Calendar, CreditCard, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Subscription } from '@/lib/db/schema';

export function SubscriptionStatusCard({
  subscription,
}: {
  subscription: Subscription & { isActive: boolean };
}) {
  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    trialing: 'bg-blue-500',
    past_due: 'bg-yellow-500',
    canceled: 'bg-gray-500',
    incomplete: 'bg-orange-500',
    unpaid: 'bg-red-500',
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
    unpaid: 'Unpaid',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription Status</CardTitle>
          <Badge
            className={statusColors[subscription.status] || 'bg-gray-500'}
          >
            {statusLabels[subscription.status] || subscription.status}
          </Badge>
        </div>
        <CardDescription>
          {subscription.plan === 'monthly' ? 'Monthly Pro' : 'Annual Pro'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Renewal Date:</span>
          <span className="font-medium">
            {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Billing Cycle:</span>
          <span className="font-medium">
            {subscription.plan === 'monthly' ? 'Monthly' : 'Yearly'}
          </span>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="flex items-start gap-2 text-sm p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Subscription Ending
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                Your subscription will end on{' '}
                {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                . You will retain access until then.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
