import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({
  path: ".env.local",
});

const runMigrate = async () => {
  // Skip migrations during Docker build (no DB available)
  if (process.env.SKIP_DB_MIGRATE === "1") {
    console.log("⏭️  Skipping migrations (SKIP_DB_MIGRATE=1)");
    process.exit(0);
  }

  // On Vercel, only run migrations for production deployments
  // On Docker/self-hosted, always run migrations (VERCEL_ENV won't be set)
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    console.log(
      `⏭️  Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV})`
    );
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  const connection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");

  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
