// Fork contract for masonjames/sparka. Run `node scripts/check-fork.mjs` from the
// repository root, or `node scripts/check-fork.mjs --self-test` to prove that every
// assertion fails on a broken input.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf-8");
const isObject = (value) => typeof value === "object" && value !== null;
const MIGRATION_TAG = /^\d{4}_[a-z0-9_]+$/u;

/** Remove comments and string literals so the checks only see code. */
const codeOnly = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/[^\n]*/gu, "")
    .replace(
      /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/gu,
      '""'
    );

/** The body of `key: { ... }` in the config literal (no nested braces). */
const block = (code, key) => {
  const match = new RegExp(`\\b${key}\\s*:\\s*\\{([^{}]*)\\}`, "u").exec(code);
  assert.ok(match, `chat.config.ts: ${key} block not found`);
  return match[1];
};

export const checkConfig = (source) => {
  assert.ok(
    /\bappUrl\s*:\s*"https:\/\/chat\.masonjames\.com"/u.test(source),
    "chat.config.ts: appUrl must be https://chat.masonjames.com"
  );
  const code = codeOnly(source);
  const authentication = block(code, "authentication");
  for (const provider of ["github", "google", "vercel"]) {
    assert.ok(
      new RegExp(`\\b${provider}\\s*:\\s*false\\b`, "u").test(authentication),
      `chat.config.ts: authentication.${provider} must be false`
    );
  }
  assert.ok(
    /\benabled\s*:\s*false\b/u.test(block(code, "desktopApp")),
    "chat.config.ts: desktopApp.enabled must be false"
  );
};

export const checkPackage = (source) => {
  const pkg = JSON.parse(source);
  assert.ok(isObject(pkg), "apps/chat/package.json: not an object");
  for (const section of ["dependencies", "devDependencies"]) {
    const deps = pkg[section] ?? {};
    assert.ok(isObject(deps), `apps/chat/package.json: invalid ${section}`);
    for (const name of ["stripe", "resend", "@tryghost/admin-api"]) {
      assert.ok(!Object.hasOwn(deps, name), `${section}: remove ${name}`);
    }
  }
};

export const checkAuth = (source) => {
  for (const legacy of [
    "magicLink",
    "emailAndPassword",
    "crossSubDomainCookies",
  ]) {
    assert.ok(
      !source.includes(legacy),
      `lib/auth.ts: legacy auth found: ${legacy}`
    );
  }
};

export const checkJournal = (source, readSql) => {
  const journal = JSON.parse(source);
  assert.ok(
    isObject(journal) && Array.isArray(journal.entries),
    "journal: invalid"
  );
  const tags = new Set();
  let lastIdx = -1;
  for (const entry of journal.entries) {
    assert.ok(isObject(entry), "journal: invalid entry");
    const { tag, idx } = entry;
    assert.ok(
      typeof tag === "string" && MIGRATION_TAG.test(tag),
      `journal: invalid tag ${tag}`
    );
    assert.ok(
      Number.isInteger(idx) && idx > lastIdx,
      `journal: idx must increase at ${tag}`
    );
    lastIdx = idx;
    assert.ok(!tags.has(tag), `journal: duplicate tag ${tag}`);
    tags.add(tag);
    assert.ok(readSql(tag).trim().length > 0, `journal: empty SQL for ${tag}`);
  }
};

const DOCUMENTS = [
  "docs/adr/001-chatjs-replatform-and-paid-access-bridge.md",
  "docs/replatform-plan.md",
  "docs/deployment.md",
];

const selfTest = () => {
  const valid = read("apps/chat/chat.config.ts");
  checkConfig(valid);
  const broken = [
    [
      valid.replace('"https://chat.masonjames.com"', '"https://example.com"'),
      "appUrl",
    ],
    [valid.replace("github: false", "github: true"), "github"],
    [
      valid.replace("google: false", "google: true, // google: false"),
      "google",
    ],
    [
      valid.replace(
        /desktopApp:\s*\{\s*enabled:\s*false/u,
        "desktopApp: {\n    enabled: true, // enabled: false"
      ),
      "desktopApp",
    ],
  ];
  for (const [source, name] of broken) {
    assert.notEqual(source, valid, `self-test: ${name} fixture unchanged`);
    assert.throws(
      () => checkConfig(source),
      `self-test: ${name} check did not fail`
    );
  }
  assert.throws(
    () => checkPackage('{"dependencies":{"stripe":"1"}}'),
    "self-test: stripe"
  );
  assert.throws(() => checkAuth("magicLink({"), "self-test: magicLink");
  assert.throws(
    () => checkJournal('{"entries":[{"idx":0,"tag":"../x"}]}', () => "x"),
    "self-test: tag"
  );
  assert.throws(
    () =>
      checkJournal(
        '{"entries":[{"idx":1,"tag":"0001_a"},{"idx":0,"tag":"0002_b"}]}',
        () => "x"
      ),
    "self-test: idx"
  );
  console.log("Fork contract self-test passed");
};

const main = () => {
  checkPackage(read("apps/chat/package.json"));
  checkConfig(read("apps/chat/chat.config.ts"));
  checkAuth(read("apps/chat/lib/auth.ts"));
  for (const path of DOCUMENTS) {
    assert.ok(read(path).trim().length > 0, `empty document: ${path}`);
  }
  const migrations = "apps/chat/lib/db/migrations";
  checkJournal(read(`${migrations}/meta/_journal.json`), (tag) =>
    read(`${migrations}/${tag}.sql`)
  );
  console.log("Fork contract passed");
};

try {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    main();
  }
} catch (error) {
  console.error(
    `Fork contract failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
