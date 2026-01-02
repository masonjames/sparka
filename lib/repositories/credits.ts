import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { userCredit } from "../db/schema";

async function ensureUserCreditRow(userId: string) {
  await db.insert(userCredit).values({ userId }).onConflictDoNothing();
}

/**
 * Get user's current credit balance (in cents).
 */
export async function getCredits(userId: string): Promise<number> {
  let rows = await db
    .select({ credits: userCredit.credits })
    .from(userCredit)
    .where(eq(userCredit.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    await ensureUserCreditRow(userId);
    rows = await db
      .select({ credits: userCredit.credits })
      .from(userCredit)
      .where(eq(userCredit.userId, userId))
      .limit(1);
  }

  return rows[0]?.credits ?? 0;
}

/**
 * Check if user has positive credits (can spend).
 */
export async function canSpend(userId: string): Promise<boolean> {
  const credits = await getCredits(userId);
  return credits > 0;
}

/**
 * Deduct credits from user. Allows going slightly negative for in-progress operations.
 */
export async function deductCredits(
  userId: string,
  amount: number
): Promise<void> {
  await ensureUserCreditRow(userId);
  await db
    .update(userCredit)
    .set({
      credits: sql`${userCredit.credits} - ${amount}`,
    })
    .where(eq(userCredit.userId, userId));
}

/**
 * Add credits to user (for purchases, refunds, etc).
 */
export async function addCredits(
  userId: string,
  amount: number
): Promise<void> {
  await ensureUserCreditRow(userId);
  await db
    .update(userCredit)
    .set({
      credits: sql`${userCredit.credits} + ${amount}`,
    })
    .where(eq(userCredit.userId, userId));
}

// Legacy exports for backwards compatibility during migration
export async function getUserCreditsInfo({ userId }: { userId: string }) {
  const credits = await getCredits(userId);
  return {
    totalCredits: credits,
    availableCredits: credits,
    reservedCredits: 0,
  };
}

// Keep old functions during migration - will be removed
export async function reserveAvailableCredits(_args: {
  userId: string;
  maxAmount: number;
  minAmount: number;
}): Promise<
  { success: true; reservedAmount: number } | { success: false; error: string }
> {
  // No-op during migration - just check if user can spend
  const canUserSpend = await canSpend(_args.userId);
  if (!canUserSpend) {
    return { success: false, error: "Insufficient credits" };
  }
  return { success: true, reservedAmount: _args.maxAmount };
}

export async function finalizeCreditsUsage({
  userId,
  actualAmount,
}: {
  userId: string;
  reservedAmount: number;
  actualAmount: number;
}): Promise<void> {
  await deductCredits(userId, actualAmount);
}

export async function releaseReservedCredits(_args: {
  userId: string;
  amount: number;
}): Promise<void> {
  // No-op - no more reservations
}

/**
 * Grant credits to a user (e.g., for subscription renewal)
 * Free users: 100 credits (default)
 * Subscribers: 10,000 credits/month
 */
export async function grantCredits({
  userId,
  amount,
}: {
  userId: string;
  amount: number;
}): Promise<void> {
  await ensureUserCreditRow(userId);

  await db
    .update(userCredit)
    .set({
      credits: amount, // Set to exact amount (will be called monthly for subscribers)
    })
    .where(eq(userCredit.userId, userId));
}
