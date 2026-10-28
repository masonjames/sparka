// Fork contract for masonjames/sparka. Run `bun scripts/check-fork.ts` from the
// repository root. `bun scripts/check-fork.ts --self-test` evaluates one broken
// fixture per reachable assertion and requires the assertion's own message.
// The self-test writes short-lived fixture files into apps/chat, so run it in
// the gate, not beside `bun dev` or another watcher of that directory.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const EMPTY_LENGTH = 0;
const FIRST_INDEX = 0;
const NEXT_INDEX = 1;
const MIGRATION_TAG = /^(?<index>\d{4})_[a-z0-9_]+$/u;
const APP_URL = "https://chat.masonjames.com";
const LEGACY_DEPENDENCIES = [
  "stripe",
  "@stripe/stripe-js",
  "@better-auth/stripe",
  "resend",
  "@tryghost/admin-api",
  "@tryghost/content-api",
];
const LEGACY_AUTH = ["magicLink", "emailAndPassword", "crossSubDomainCookies"];
const MANIFESTS = ["package.json", "apps/chat/package.json"];
const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;
const DOCUMENTS = [
  "docs/adr/001-chatjs-replatform-and-paid-access-bridge.md",
  "docs/replatform-plan.md",
  "docs/deployment.md",
];
const MIGRATIONS = "apps/chat/lib/db/migrations";
/** Upstream's EVE baseline history; the migration runner rejects any other prefix. */
const UPSTREAM_TAGS = [
  "0000_eve_baseline",
  "0001_brainy_the_stranger",
  "0002_nappy_caretaker",
  "0003_ambitious_oracle",
  "0004_misty_next_avengers",
  "0005_managed_workflow_safeguards",
  "0006_unpriced_usage_index",
  "0007_kind_charles_xavier",
  "0008_mysterious_excalibur",
  "0009_absent_the_hunter",
  "0010_omniscient_junta",
  "0011_followup_chat_index",
  "0012_aberrant_joseph",
  "0013_current_copy_seed",
  "0014_current_copy_ancestry",
  "0015_conscious_gorilla_man",
  "0016_large_zeigeist",
  "0017_flimsy_whiplash",
  "0018_shallow_tyrannus",
  "0019_woozy_wither",
  "0020_organic_black_panther",
  "0021_glorious_chameleon",
];
const CONFIG_PATH = "apps/chat/chat.config.ts";
const FIXTURE_DIRECTORY = "apps/chat";

const configSchema = z.object({
  appUrl: z.string(),
  // Every provider, including any that a future upstream sync adds.
  authentication: z.record(z.string(), z.boolean()),
  desktopApp: z.object({ enabled: z.boolean() }),
});
const manifestSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  optionalDependencies: z.record(z.string(), z.string()).optional(),
  peerDependencies: z.record(z.string(), z.string()).optional(),
});
const journalSchema = z.object({
  entries: z.array(z.object({ idx: z.number().int(), tag: z.string() })),
});

const read = (file: string): string => readFileSync(file, "utf-8");

/** Evaluate a config module and check what the app will actually run with. */
const checkConfigModule = async (modulePath: string): Promise<void> => {
  const loaded: unknown = await import(path.resolve(modulePath));
  const parsed = configSchema.safeParse(
    z.object({ default: z.unknown() }).parse(loaded).default
  );
  assert.ok(parsed.success, "chat.config.ts: default export is not a config");
  const config = parsed.data;
  assert.equal(
    config.appUrl,
    APP_URL,
    `chat.config.ts: appUrl must be ${APP_URL}`
  );
  const providers = Object.keys(config.authentication);
  for (const provider of ["github", "google", "vercel"]) {
    assert.ok(
      providers.includes(provider),
      `chat.config.ts: authentication.${provider} missing`
    );
  }
  for (const provider of providers) {
    assert.equal(
      config.authentication[provider],
      false,
      `chat.config.ts: authentication.${provider} must be false`
    );
  }
  assert.equal(
    config.desktopApp.enabled,
    false,
    "chat.config.ts: desktopApp.enabled must be false"
  );
};

const checkManifest = (file: string, source: string): void => {
  const parsed = manifestSchema.safeParse(JSON.parse(source));
  assert.ok(parsed.success, `${file}: invalid manifest`);
  for (const section of DEPENDENCY_SECTIONS) {
    const names = Object.keys(parsed.data[section] ?? {});
    for (const name of LEGACY_DEPENDENCIES) {
      assert.ok(!names.includes(name), `${file} ${section}: remove ${name}`);
    }
  }
};

const checkAuth = (source: string): void => {
  for (const legacy of LEGACY_AUTH) {
    assert.ok(
      !source.includes(legacy),
      `lib/auth.ts: legacy auth found: ${legacy}`
    );
  }
};

const checkJournal = (
  source: string,
  sqlFiles: readonly string[],
  readSql: (tag: string) => string
): void => {
  const parsed = journalSchema.safeParse(JSON.parse(source));
  assert.ok(parsed.success, "journal: invalid shape");
  const { entries } = parsed.data;
  assert.ok(
    entries.length >= UPSTREAM_TAGS.length,
    "journal: shorter than upstream"
  );
  for (const [index, tag] of UPSTREAM_TAGS.entries()) {
    assert.equal(
      entries[index]?.tag,
      tag,
      `journal: entry ${index} must be ${tag}`
    );
  }
  const tags = new Set<string>();
  for (const [position, { tag, idx }] of entries.entries()) {
    const index = MIGRATION_TAG.exec(tag)?.groups?.index;
    assert.ok(index !== undefined, `journal: invalid tag ${tag}`);
    assert.equal(idx, position, `journal: idx must be ${position} at ${tag}`);
    // Two equal tags cannot both satisfy "idx equals position", so no
    // separate duplicate-tag assertion is reachable.
    assert.equal(
      Number(index),
      idx,
      `journal: tag prefix must equal idx at ${tag}`
    );
    tags.add(tag);
    assert.ok(
      readSql(tag).trim().length > EMPTY_LENGTH,
      `journal: empty SQL for ${tag}`
    );
  }
  for (const file of sqlFiles) {
    assert.ok(tags.has(file.replace(/\.sql$/u, "")), `journal: orphan ${file}`);
  }
};

const checkDocument = (file: string, source: string): void => {
  assert.ok(source.trim().length > EMPTY_LENGTH, `empty document: ${file}`);
};

const expectFailure = async (
  run: () => Promise<void> | void,
  message: RegExp
): Promise<void> => {
  await assert.rejects(async () => {
    await run();
  }, message);
};

const sql = (): string => "select 1";
const blankSqlFor =
  (blank: string) =>
  (tag: string): string =>
    tag === blank ? " \n" : "select 1";
const journalOf = (tags: readonly string[]): string =>
  JSON.stringify({ entries: tags.map((tag, idx) => ({ idx, tag })) });

const FIXTURE_PREFIX = ".check-fork-fixture-";
const leftoverFixtures = (): string[] =>
  readdirSync(FIXTURE_DIRECTORY).filter((file) =>
    file.startsWith(FIXTURE_PREFIX)
  );
const refuseLeftoverFixtures = (): void => {
  assert.deepEqual(
    leftoverFixtures(),
    [],
    `leftover self-test fixtures in ${FIXTURE_DIRECTORY}; remove them`
  );
};

/** Write a modified copy of the config beside the real one so `@/` still resolves. */
const withFixture = async (
  name: string,
  source: string,
  run: (modulePath: string) => Promise<void>
): Promise<void> => {
  const file = path.join(
    FIXTURE_DIRECTORY,
    `${FIXTURE_PREFIX}${process.pid}-${name}.ts`
  );
  writeFileSync(file, source);
  try {
    await run(file);
  } finally {
    unlinkSync(file);
  }
};

const selfTest = async (): Promise<void> => {
  refuseLeftoverFixtures();
  const valid = read(CONFIG_PATH);
  await checkConfigModule(CONFIG_PATH);
  const edit = (from: string, to: string): string => {
    const changed = valid.replace(from, to);
    assert.notEqual(changed, valid, `self-test fixture unchanged: ${from}`);
    return changed;
  };
  const configCases: readonly (readonly [string, string, RegExp])[] = [
    [
      "url",
      edit(`appUrl: "${APP_URL}"`, 'appUrl: "https://example.com"'),
      /appUrl must be/u,
    ],
    [
      "github",
      edit("github: false", "github: true"),
      /authentication\.github must be false/u,
    ],
    [
      "spread",
      edit(
        "vercel: false,\n  },",
        "vercel: false,\n    ...{ google: true },\n  },"
      ),
      /authentication\.google must be false/u,
    ],
    [
      "toplevel",
      edit(
        "desktopApp: {",
        '...{ appUrl: "https://example.com" },\n  desktopApp: {'
      ),
      /appUrl must be/u,
    ],
    [
      "decoy",
      edit(
        "const config = defineConfig({",
        "const realAuth = { github: false, google: false, vercel: true };\nconst config = defineConfig({\n  authentication: realAuth,"
      ).replace(/\n {2}authentication: \{[^}]*\},/u, ""),
      /authentication\.vercel must be false/u,
    ],
    [
      "quoted",
      edit(
        "desktopApp: {",
        '"appUrl": "https://example.com",\n  desktopApp: {'
      ),
      /appUrl must be/u,
    ],
    [
      "desktop",
      edit(
        "desktopApp: {\n    enabled: false",
        "desktopApp: {\n    enabled: true"
      ),
      /desktopApp\.enabled must be false/u,
    ],
    [
      "newprovider",
      edit("vercel: false,", "vercel: false,\n    extra: true,"),
      /authentication\.extra must be false/u,
    ],
    [
      "missing",
      edit("    github: false,\n", ""),
      /authentication\.github missing/u,
    ],
    ["shape", "export default 1;\n", /default export is not a config/u],
  ];
  for (const [name, source, message] of configCases) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Each fixture replaces the evaluated config; run them in sequence.
    await withFixture(name, source, async (file) => {
      await expectFailure(async () => {
        await checkConfigModule(file);
      }, message);
    });
  }
  const manifestCases: readonly (readonly [string, RegExp])[] = [
    ["[]", /invalid manifest/u],
    ['{"dependencies":1}', /invalid manifest/u],
    ['{"dependencies":{"stripe":"1"}}', /x dependencies: remove stripe/u],
    ['{"devDependencies":{"resend":"1"}}', /x devDependencies: remove resend/u],
    [
      '{"optionalDependencies":{"@tryghost/admin-api":"1"}}',
      /x optionalDependencies: remove @tryghost\/admin-api/u,
    ],
    [
      '{"peerDependencies":{"stripe":"1"}}',
      /x peerDependencies: remove stripe/u,
    ],
  ];
  for (const [source, message] of manifestCases) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Sequential by design.
    await expectFailure(() => {
      checkManifest("x", source);
    }, message);
  }
  for (const legacy of LEGACY_AUTH) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Sequential by design.
    await expectFailure(
      () => {
        checkAuth(`x ${legacy} y`);
      },
      new RegExp(`legacy auth found: ${legacy}`, "u")
    );
  }
  const upstream = [...UPSTREAM_TAGS];
  const files = upstream.map((tag) => `${tag}.sql`);
  checkJournal(journalOf(upstream), files, sql);
  const journalCases: readonly (readonly [
    string,
    readonly string[],
    () => string,
    RegExp,
  ])[] = [
    ["[]", files, sql, /invalid shape/u],
    [
      '{"entries":[{"idx":"0","tag":"0000_eve_baseline"}]}',
      files,
      sql,
      /invalid shape/u,
    ],
    [
      journalOf(upstream.slice(FIRST_INDEX, NEXT_INDEX)),
      files,
      sql,
      /shorter than upstream/u,
    ],
    [
      journalOf([...upstream.slice(FIRST_INDEX, -NEXT_INDEX), "0021_other"]),
      files,
      sql,
      /entry 21 must be 0021_glorious_chameleon/u,
    ],
    [journalOf([...upstream, "../x"]), files, sql, /invalid tag/u],
    [
      journalOf([...upstream, "0023_skip"]),
      files,
      sql,
      /tag prefix must equal idx at 0023_skip/u,
    ],
    [
      JSON.stringify({
        entries: [...upstream, "0022_a"].map((tag, idx) => ({
          idx: idx === upstream.length ? idx + NEXT_INDEX : idx,
          tag,
        })),
      }),
      files,
      sql,
      /idx must be 22 at 0022_a/u,
    ],
    [
      journalOf([...upstream, "0022_a"]),
      files,
      blankSqlFor("0022_a"),
      /empty SQL for 0022_a/u,
    ],
    [
      journalOf(upstream),
      [...files, "0022_orphan.sql"],
      sql,
      /orphan 0022_orphan\.sql/u,
    ],
  ];
  for (const [source, sqlFiles, readSql, message] of journalCases) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- Sequential by design.
    await expectFailure(() => {
      checkJournal(source, sqlFiles, readSql);
    }, message);
  }
  await expectFailure(() => {
    checkDocument("docs/x.md", " \n");
  }, /empty document: docs\/x\.md/u);
  const stray = path.join(
    FIXTURE_DIRECTORY,
    `${FIXTURE_PREFIX}${process.pid}-stray.ts`
  );
  writeFileSync(stray, "export default 1;\n");
  try {
    await expectFailure(refuseLeftoverFixtures, /leftover self-test fixtures/u);
  } finally {
    unlinkSync(stray);
  }
  console.log("Fork contract self-test passed");
};

const main = async (): Promise<void> => {
  refuseLeftoverFixtures();
  for (const file of MANIFESTS) {
    checkManifest(file, read(file));
  }
  await checkConfigModule(CONFIG_PATH);
  checkAuth(read("apps/chat/lib/auth.ts"));
  for (const file of DOCUMENTS) {
    checkDocument(file, read(file));
  }
  const sqlFiles = readdirSync(MIGRATIONS).filter((file) =>
    file.endsWith(".sql")
  );
  checkJournal(read(`${MIGRATIONS}/meta/_journal.json`), sqlFiles, (tag) =>
    read(`${MIGRATIONS}/${tag}.sql`)
  );
  console.log("Fork contract passed");
};

try {
  await (process.argv.includes("--self-test") ? selfTest() : main());
} catch (error) {
  console.error(
    `Fork contract failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
}
