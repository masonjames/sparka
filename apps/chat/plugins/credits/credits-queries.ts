import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { userCredit } from "./credits-schema";

const NO_CREDITS = 0;
const FIRST_CREDIT_ROW_INDEX = 0;
const SINGLE_CREDIT_ROW_LIMIT = 1;

const ensureUserCreditRow = async (userId: string): Promise<void> => {
  await db.insert(userCredit).values({ userId }).onConflictDoNothing();
};
/**
 * Get user's current credit balance (in cents).
 * @param {string} userId - User whose balance is read; a missing credit row is created with the database defaults.
 * @returns {Promise<number>} Stored balance in cents, or zero if the retry still has no balance; database failures reject.
 */
const getCredits = async (userId: string): Promise<number> => {
  let rows = await db
    .select({ credits: userCredit.credits })
    .from(userCredit)
    .where(eq(userCredit.userId, userId))
    .limit(SINGLE_CREDIT_ROW_LIMIT);

  if (rows.length === NO_CREDITS) {
    await ensureUserCreditRow(userId);
    rows = await db
      .select({ credits: userCredit.credits })
      .from(userCredit)
      .where(eq(userCredit.userId, userId))
      .limit(SINGLE_CREDIT_ROW_LIMIT);
  }

  return rows[FIRST_CREDIT_ROW_INDEX]?.credits ?? NO_CREDITS;
};

/**
 * Check if user has positive credits (can spend).
 * @param {string} userId - User whose current balance is read, creating a missing credit row as needed.
 * @returns {Promise<boolean>} Whether the balance is strictly positive; this check does not reserve credits or test a requested amount.
 */
const canSpend = async (userId: string): Promise<boolean> => {
  const credits = await getCredits(userId);
  return credits > NO_CREDITS;
};

export { canSpend, getCredits };
