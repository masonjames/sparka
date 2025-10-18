'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { PricingCards } from '@/components/subscription/pricing-cards';
import { SubscriptionStatusCard } from '@/components/subscription/subscription-status-card';
import { ManageSubscriptionButton } from '@/components/subscription/manage-subscription-button';
import { useTRPC } from '@/trpc/react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FREE_PLAN } from '@/lib/subscription/subscription-plans';
import { Check } from 'lucide-react';

export function SubscriptionPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const { data: subscription, isLoading } = useQuery({
    ...trpc.subscription.getCurrentSubscription.queryOptions(),
  });

  const { data: creditsData } = useQuery({
    ...trpc.credits.getUserCredits.queryOptions(),
  });

  const credits = creditsData?.totalCredits ?? 0;

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      toast.success('Subscription created successfully!');
      router.replace('/subscription');
    }

    if (canceled) {
      toast.error('Checkout canceled');
      router.replace('/subscription');
    }
  }, [searchParams, router]);

  const handleSelectPlan = async (plan: 'monthly' | 'annual') => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to start checkout process',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl py-10 space-y-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasActiveSubscription = subscription?.isActive ?? false;

  return (
    <div className="container mx-auto max-w-5xl py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {hasActiveSubscription && subscription ? (
        <div className="space-y-6">
          <SubscriptionStatusCard subscription={subscription} />
          <ManageSubscriptionButton />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Free Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Current Plan: {FREE_PLAN.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Credits Available:
                  </span>
                  <span className="font-medium">{credits}</span>
                </div>
                <ul className="space-y-2">
                  {FREE_PLAN.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade Section */}
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
              <p className="text-muted-foreground">
                Unlock unlimited access to all features
              </p>
            </div>
            <PricingCards onSelectPlan={handleSelectPlan} />
          </div>
        </div>
      )}
    </div>
  );
}
