"use strict";
const path = require("node:path");
const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");
const { migrate } = require("drizzle-orm/postgres-js/migrator");

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: path.join(__dirname, "..", "lib", "db", "migrations"),
    });
  } finally {
    await sql.end();
  }
}

run().catch((error) => {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
});
