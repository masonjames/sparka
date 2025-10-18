'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SUBSCRIPTION_PLANS } from '@/lib/subscription/subscription-plans';
import { useState } from 'react';

export function PricingCards({
  onSelectPlan,
  currentPlan,
}: {
  onSelectPlan: (plan: 'monthly' | 'annual') => Promise<void>;
  currentPlan?: 'monthly' | 'annual' | null;
}) {
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);

  const handleSelectPlan = async (plan: 'monthly' | 'annual') => {
    setLoading(plan);
    try {
      await onSelectPlan(plan);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Monthly Plan */}
      <Card className={currentPlan === 'monthly' ? 'border-primary' : ''}>
        <CardHeader>
          <CardTitle>{SUBSCRIPTION_PLANS.MONTHLY.name}</CardTitle>
          <CardDescription>
            <span className="text-3xl font-bold">
              ${SUBSCRIPTION_PLANS.MONTHLY.price}
            </span>
            <span className="text-muted-foreground">/month</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {SUBSCRIPTION_PLANS.MONTHLY.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => handleSelectPlan('monthly')}
            disabled={
              loading !== null || currentPlan === 'monthly'
            }
          >
            {loading === 'monthly'
              ? 'Loading...'
              : currentPlan === 'monthly'
                ? 'Current Plan'
                : 'Subscribe Monthly'}
          </Button>
        </CardFooter>
      </Card>

      {/* Annual Plan */}
      <Card
        className={
          currentPlan === 'annual'
            ? 'border-primary'
            : 'border-primary/50 relative'
        }
      >
        {!currentPlan && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
              Best Value
            </span>
          </div>
        )}
        <CardHeader>
          <CardTitle>{SUBSCRIPTION_PLANS.ANNUAL.name}</CardTitle>
          <CardDescription>
            <span className="text-3xl font-bold">
              ${SUBSCRIPTION_PLANS.ANNUAL.price}
            </span>
            <span className="text-muted-foreground">/year</span>
            <div className="mt-1 text-xs text-primary">
              Save $34/year (40% off)
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {SUBSCRIPTION_PLANS.ANNUAL.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            onClick={() => handleSelectPlan('annual')}
            disabled={loading !== null || currentPlan === 'annual'}
          >
            {loading === 'annual'
              ? 'Loading...'
              : currentPlan === 'annual'
                ? 'Current Plan'
                : 'Subscribe Annually'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
