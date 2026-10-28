import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/** @param {string} path File path relative to the repository root. */
const read = (path) => readFileSync(path, "utf-8");
/**
 * @param {unknown} value Parsed JSON value.
 * @returns {value is Record<string, unknown>} Whether value is an object.
 */
const isObject = (value) => typeof value === "object" && value !== null;

try {
  /** @type {unknown} */
  const pkg = JSON.parse(read("apps/chat/package.json"));
  assert.ok(isObject(pkg), "Invalid app package");
  for (const section of ["dependencies", "devDependencies"]) {
    const deps = pkg[section];
    assert.ok(deps === undefined || isObject(deps), `Invalid ${section}`);
    for (const name of [
      "stripe",
      "resend",
      "@tryghost/admin-api",
      "@aws-sdk/client-s3",
    ]) {
      assert.ok(
        !deps || !Object.hasOwn(deps, name),
        `${section}: remove ${name}`
      );
    }
  }
  const config = read("apps/chat/chat.config.ts");
  assert.ok(config.includes("https://chat.masonjames.com"), "Fork URL missing");
  for (const provider of ["github", "google", "vercel"]) {
    assert.ok(config.includes(`${provider}: false`), `${provider} must be off`);
  }
  assert.ok(
    /desktopApp\s*:\s*\{[^}]*\benabled\s*:\s*false\b/u.test(config),
    "desktopApp.enabled must be false"
  );
  const auth = read("apps/chat/lib/auth.ts");
  for (const legacy of ["magicLink", "crossSubDomainCookies"]) {
    assert.ok(!auth.includes(legacy), `Legacy auth found: ${legacy}`);
  }
  for (const path of [
    "docs/adr/001-chatjs-replatform-and-paid-access-bridge.md",
    "docs/replatform-plan.md",
    "docs/deployment.md",
  ]) {
    assert.ok(read(path).trim().length > 0, `Empty document: ${path}`);
  }
  const migrations = "apps/chat/lib/db/migrations";
  /** @type {unknown} */
  const journal = JSON.parse(read(`${migrations}/meta/_journal.json`));
  assert.ok(isObject(journal), "Invalid migration journal");
  assert.ok(Array.isArray(journal.entries), "Journal entries must be an array");
  /** @type {{entries: unknown[]}} */
  const { entries } = journal;
  const tags = new Set();
  for (const entry of entries) {
    assert.ok(isObject(entry), "Invalid migration entry");
    const { tag } = entry;
    assert.ok(
      typeof tag === "string" && tag.length > 0,
      "Invalid migration tag"
    );
    assert.ok(!tags.has(tag), `Duplicate migration tag: ${tag}`);
    tags.add(tag);
    assert.ok(
      read(`${migrations}/${tag}.sql`).trim().length > 0,
      `Empty SQL: ${tag}`
    );
  }
  console.log("Fork contract passed");
} catch (error) {
  console.error(`Fork contract failed: ${error.message}`);
  process.exitCode = 1;
}
