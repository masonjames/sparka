"use strict";
// Disposable PostgreSQL only. Covers the old Docker ledger, data survival, and reruns.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");

async function run() {
  assert.equal(process.env.MIGRATION_TEST_DISPOSABLE, "1");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sparka-migrations-"));
  try {
    const [{ count }] =
      await sql`SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public'`;
    assert.equal(count, 0, "Refusing a non-empty database");
    const directory = path.join(__dirname, "../lib/db/migrations");
    fs.cpSync(directory, temp, { recursive: true });
    const journal = JSON.parse(
      fs.readFileSync(path.join(temp, "meta/_journal.json"))
    );
    journal.entries = journal.entries.filter((entry) => entry.idx <= 43);
    fs.writeFileSync(
      path.join(temp, "meta/_journal.json"),
      JSON.stringify(journal)
    );
    await migrate(drizzle(sql), { migrationsFolder: temp });
    // The previous container wrote tags instead of SHA-256 values in `hash`.
    for (const entry of journal.entries) {
      await sql`UPDATE drizzle.__drizzle_migrations SET hash = ${entry.tag} WHERE created_at = ${entry.when}`;
    }
    // Some existing installs already created the unjournaled fork tables.
    await sql.unsafe(
      fs.readFileSync(
        path.join(directory, "0032_entitlements_webhooks.sql"),
        "utf8"
      )
    );
    await sql`INSERT INTO "user" (id, name, email) VALUES ('migration-user', 'Migration', 'migration@example.invalid')`;
    await sql`INSERT INTO "Entitlement" (id, "userId", source, "externalId") VALUES ('migration-entitlement', 'migration-user', 'stripe', 'sub_existing')`;
    const execute = () =>
      execFileSync(
        process.execPath,
        [path.join(__dirname, "docker-migrate.cjs")],
        { stdio: "inherit" }
      );
    execute();
    const ledger =
      await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
    execute();
    assert.deepEqual(
      await sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`,
      ledger
    );
    const [entitlement] =
      await sql`SELECT id FROM "Entitlement" WHERE "externalId" = 'sub_existing'`;
    assert.equal(entitlement.id, "migration-entitlement");
    await sql`INSERT INTO "Entitlement" (id, "userId", source, "externalId") VALUES ('new-id', 'migration-user', 'stripe', 'sub_existing') ON CONFLICT (source, "externalId") DO UPDATE SET status = 'active'`;
    await sql`INSERT INTO "WebhookEvent" (id, source, "eventId", "eventType", payload) VALUES ('evt-1', 'stripe', 'evt_existing', 'test', '{}')`;
    await assert.rejects(
      sql`INSERT INTO "WebhookEvent" (id, source, "eventId", "eventType", payload) VALUES ('evt-2', 'stripe', 'evt_existing', 'test', '{}')`,
      { code: "23505" }
    );
    console.log(
      "Migration upgrade, data preservation, rerun, and unique constraints passed"
    );
  } finally {
    await sql.end();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
