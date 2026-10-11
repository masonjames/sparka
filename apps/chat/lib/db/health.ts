import { sql } from "drizzle-orm";

import { db } from "./client";

let pending: Promise<void> | undefined;
/* oxlint-disable typescript/promise-function-async --
 * typescript/promise-function-async (#606): checkDatabase preserves the returned promise and synchronous throw timing; adding async would wrap the promise and convert immediate throws into rejections.
 */
export const checkDatabase = (): Promise<void> => {
  // An unavailable database must not accumulate another query on every probe.
  pending ??= (async (): Promise<void> => {
    try {
      await db.execute(sql`select 1`);
    } finally {
      pending = undefined;
    }
  })();
  return pending;
};
/* oxlint-enable typescript/promise-function-async */
