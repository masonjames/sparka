/**
 * Minimal migration runner for Docker standalone containers.
 * Uses raw postgres driver to run SQL migration files directly.
 * No drizzle-orm dependency — works with Next.js standalone node_modules.
 */
const path = require("path");
const fs = require("fs");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("⏭️  No DATABASE_URL set, skipping migrations");
  process.exit(0);
}

if (process.env.SKIP_DB_MIGRATE === "1") {
  console.log("⏭️  Skipping migrations (SKIP_DB_MIGRATE=1)");
  process.exit(0);
}

async function run() {
  // Dynamic require — postgres should be in standalone node_modules
  const postgres = require("postgres");
  const sql = postgres(databaseUrl, { max: 1 });

  const migrationsDir = path.join(__dirname, "..", "lib", "db", "migrations");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");

  if (!fs.existsSync(journalPath)) {
    console.log("⏭️  No migration journal found, skipping");
    await sql.end();
    process.exit(0);
  }

  // Ensure drizzle migration tracking schema exists
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `;

  // Get already-applied migrations
  const applied = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
  const appliedHashes = new Set(applied.map((r) => r.hash));

  // Read journal
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  const entries = journal.entries || [];

  let migrated = 0;
  const start = Date.now();

  for (const entry of entries) {
    const sqlFile = path.join(migrationsDir, `${entry.tag}.sql`);
    // Drizzle uses the tag as the hash
    if (appliedHashes.has(entry.tag)) continue;

    if (!fs.existsSync(sqlFile)) {
      console.log(`⚠️  Migration file not found: ${entry.tag}.sql, skipping`);
      continue;
    }

    const migrationSql = fs.readFileSync(sqlFile, "utf8").trim();
    if (!migrationSql) continue;

    console.log(`  Applying: ${entry.tag}`);
    try {
      // Split on statement breakpoints and run each statement
      const statements = migrationSql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);

      await sql.begin(async (tx) => {
        for (const stmt of statements) {
          await tx.unsafe(stmt);
        }
        await tx`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${entry.tag}, ${entry.when})
        `;
      });
      migrated++;
    } catch (err) {
      console.error(`❌ Failed on ${entry.tag}:`, err.message);
      await sql.end();
      process.exit(1);
    }
  }

  const elapsed = Date.now() - start;
  if (migrated > 0) {
    console.log(`✅ Applied ${migrated} migration(s) in ${elapsed}ms`);
  } else {
    console.log(`✅ Database is up to date (${elapsed}ms)`);
  }

  await sql.end();
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
