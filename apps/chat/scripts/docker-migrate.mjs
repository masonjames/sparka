/**
 * Standalone migration runner for Docker containers.
 * Uses only Node.js built-ins + packages available in the standalone output.
 * Runs at container startup before the Next.js server.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("⏭️  No DATABASE_URL set, skipping migrations");
  process.exit(0);
}

if (process.env.SKIP_DB_MIGRATE === "1") {
  console.log("⏭️  Skipping migrations (SKIP_DB_MIGRATE=1)");
  process.exit(0);
}

try {
  const connection = postgres(databaseUrl, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");
  const start = Date.now();
  await migrate(db, { migrationsFolder: "./apps/chat/lib/db/migrations" });
  console.log(`✅ Migrations completed in ${Date.now() - start}ms`);

  await connection.end();
  process.exit(0);
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
}
