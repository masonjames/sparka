import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(`apps/chat/${file}`, "utf8");
const pkg = JSON.parse(read("package.json"));
for (const dependency of ["stripe", "resend", "@aws-sdk/client-s3", "@tryghost/admin-api"]) {
  assert(pkg.dependencies[dependency], `Missing fork dependency: ${dependency}`);
}
for (const [file, marker] of [
  ["trpc/routers/_app.ts", "entitlements: entitlementsRouter"],
  ["app/api/webhooks/stripe/route.ts", "stripe.webhooks.constructEvent"],
  ["app/api/webhooks/ghost/route.ts", "provisionFromGhost"],
  ["lib/entitlements/provisioning.ts", "provisionFromStripe"],
  ["lib/auth.ts", "magicLink({"],
  ["lib/auth.ts", "crossSubDomainCookies"],
  ["lib/storage-provider.ts", "env.R2_ENDPOINT"],
  ["chat.config.ts", "https://chat.masonjames.com"],
  ["lib/db/schema.ts", 'uniqueIndex("entitlement_source_external_id_idx")'],
  ["lib/db/schema.ts", 'uniqueIndex("webhook_event_source_event_id_idx")'],
]) {
  assert(read(file).includes(marker), `Missing fork contract: ${file}: ${marker}`);
}
const journal = JSON.parse(read("lib/db/migrations/meta/_journal.json"));
const tags = new Set();
for (const entry of journal.entries) {
  assert(!tags.has(entry.tag), `Duplicate migration: ${entry.tag}`);
  tags.add(entry.tag);
  assert(read(`lib/db/migrations/${entry.tag}.sql`).trim());
}
assert(journal.entries.some(({ tag }) => tag === "0046_fork_entitlements"));
console.log("Fork and migration contracts passed");

assert(journal.entries.at(-1).when > Math.max(...journal.entries.slice(0, -1).map(({ when }) => when)));
