import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ChatMessage } from "@/lib/ai/types";
import { mapUIMessagePartsToDBParts } from "@/lib/utils/message-mapping";
import { message, part } from "./schema";

config({
  path: ".env.local",
});

const runBackfill = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Starting parts backfill...");

  const start = Date.now();

  try {
    // Get all messages
    const allMessages = await db.select().from(message);
    console.log(`📊 Found ${allMessages.length} messages to process`);

    if (allMessages.length === 0) {
      console.log("✅ No messages to backfill");
      process.exit(0);
    }

    // Get all existing parts to skip messages that already have parts
    const messageIds = allMessages.map((msg) => msg.id);
    const existingParts = await db
      .select({ messageId: part.messageId })
      .from(part)
      .where(inArray(part.messageId, messageIds));

    const messagesWithParts = new Set(existingParts.map((p) => p.messageId));

    // Filter messages that need backfilling
    const messagesToBackfill = allMessages.filter(
      (msg) => !messagesWithParts.has(msg.id)
    );

    console.log(
      `📝 ${messagesToBackfill.length} messages need backfilling (${allMessages.length - messagesToBackfill.length} already have parts)`
    );

    if (messagesToBackfill.length === 0) {
      console.log("✅ All messages already have parts in Part table");
      process.exit(0);
    }

    // Process messages in batches to avoid memory issues
    const batchSize = 100;
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < messagesToBackfill.length; i += batchSize) {
      const batch = messagesToBackfill.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(messagesToBackfill.length / batchSize);

      console.log(
        `\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} messages)...`
      );

      for (const msg of batch) {
        try {
          // Parse parts from JSON (parts column may still exist in DB for old data)
          const parts = (msg as { parts?: unknown }).parts as
            | ChatMessage["parts"]
            | null
            | undefined;

          if (!Array.isArray(parts) || parts.length === 0) {
            // Skip messages with no parts
            processed++;
            continue;
          }

          // Convert to DB parts
          const dbParts = mapUIMessagePartsToDBParts(parts, msg.id);

          if (dbParts.length > 0) {
            // Insert parts in a transaction
            await db.transaction(async (tx) => {
              await tx.insert(part).values(dbParts);
            });

            successCount++;
          }

          processed++;

          // Show progress every 10 messages
          if (processed % 10 === 0) {
            console.log(
              `  ✓ Processed ${processed}/${messagesToBackfill.length} messages (${successCount} successful, ${errorCount} errors)`
            );
          }
        } catch (error) {
          errorCount++;
          console.error(
            `  ✗ Error processing message ${msg.id}:`,
            error instanceof Error ? error.message : String(error)
          );
          processed++;
        }
      }
    }

    const end = Date.now();
    const duration = ((end - start) / 1000).toFixed(2);

    console.log("\n✅ Backfill completed!");
    console.log(`   Total messages processed: ${processed}`);
    console.log(`   Successfully backfilled: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Duration: ${duration}s`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Backfill failed");
    console.error(error);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

runBackfill().catch((err) => {
  console.error("❌ Backfill failed");
  console.error(err);
  process.exit(1);
});
