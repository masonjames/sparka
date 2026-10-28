// Fork contract for masonjames/sparka. Run `bun scripts/check-fork.ts` from the
// repository root. `bun scripts/check-fork.ts --self-test` runs one negative
// fixture per assertion and requires the assertion's own message.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";

const EXACTLY_ONE = 1;
const EMPTY_LENGTH = 0;
const NO_INDEX_YET = -1;
const MIGRATION_TAG = /^\d{4}_[a-z0-9_]+$/u;
// One pass, leftmost match wins, so a `//` inside a string is never a comment.
const TOKENS =
  /(?<literal>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu;
const LEGACY_DEPENDENCIES = ["stripe", "resend", "@tryghost/admin-api"];
const LEGACY_AUTH = ["magicLink", "emailAndPassword", "crossSubDomainCookies"];
const DOCUMENTS = [
  "docs/adr/001-chatjs-replatform-and-paid-access-bridge.md",
  "docs/replatform-plan.md",
  "docs/deployment.md",
];
const MIGRATIONS = "apps/chat/lib/db/migrations";

const packageSchema = z.object({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});
const journalSchema = z.object({
  entries: z.array(z.object({ idx: z.number().int(), tag: z.string() })),
});

const read = (path: string): string => readFileSync(path, "utf-8");

/** Source without comments; string literals are kept. */
const withoutComments = (source: string): string =>
  source.replace(TOKENS, (match, literal: string | undefined) => literal ?? "");
/** Source without comments and with every string literal replaced by "". */
const codeOnly = (source: string): string =>
  source.replace(TOKENS, (match, literal: string | undefined) =>
    literal === undefined ? "" : '""'
  );

/** The body of `key: { ... }` in the config literal (no nested braces). */
const block = (code: string, key: string): string => {
  const match = new RegExp(`\\b${key}\\s*:\\s*\\{(?<body>[^{}]*)\\}`, "u").exec(
    code
  );
  const body = match?.groups?.body;
  assert.ok(body !== undefined, `chat.config.ts: ${key} block not found`);
  return body;
};

/** `key: false` followed by `,` or `}` and nothing else. */
const isFalse = (body: string, key: string): boolean =>
  new RegExp(`\\b${key}\\s*:\\s*false\\s*[,}]`, "u").test(`${body}}`);

const checkConfig = (source: string): void => {
  const appUrls = withoutComments(source).match(/\bappUrl\s*:[^\n]*/gu) ?? [];
  assert.equal(
    appUrls.length,
    EXACTLY_ONE,
    "chat.config.ts: exactly one appUrl key"
  );
  assert.ok(
    /^appUrl\s*:\s*"https:\/\/chat\.masonjames\.com"\s*,?\s*$/u.test(
      appUrls[0] ?? ""
    ),
    "chat.config.ts: appUrl must be https://chat.masonjames.com"
  );
  const code = codeOnly(source);
  const authentication = block(code, "authentication");
  for (const provider of ["github", "google", "vercel"]) {
    assert.ok(
      isFalse(authentication, provider),
      `chat.config.ts: authentication.${provider} must be false`
    );
  }
  assert.ok(
    isFalse(block(code, "desktopApp"), "enabled"),
    "chat.config.ts: desktopApp.enabled must be false"
  );
};

const checkPackage = (source: string): void => {
  const parsed = packageSchema.safeParse(JSON.parse(source));
  assert.ok(parsed.success, "apps/chat/package.json: invalid manifest");
  for (const section of ["dependencies", "devDependencies"] as const) {
    const names = Object.keys(parsed.data[section] ?? {});
    for (const name of LEGACY_DEPENDENCIES) {
      assert.ok(!names.includes(name), `${section}: remove ${name}`);
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
  readSql: (tag: string) => string
): void => {
  const parsed = journalSchema.safeParse(JSON.parse(source));
  assert.ok(parsed.success, "journal: invalid shape");
  const tags = new Set<string>();
  let lastIdx = NO_INDEX_YET;
  for (const { tag, idx } of parsed.data.entries) {
    assert.ok(MIGRATION_TAG.test(tag), `journal: invalid tag ${tag}`);
    assert.ok(idx > lastIdx, `journal: idx must increase at ${tag}`);
    lastIdx = idx;
    assert.ok(!tags.has(tag), `journal: duplicate tag ${tag}`);
    tags.add(tag);
    assert.ok(
      readSql(tag).trim().length > EMPTY_LENGTH,
      `journal: empty SQL for ${tag}`
    );
  }
};

const checkDocument = (path: string, source: string): void => {
  assert.ok(source.trim().length > EMPTY_LENGTH, `empty document: ${path}`);
};

const expectFailure = (run: () => void, message: RegExp): void => {
  assert.throws(() => {
    run();
  }, message);
};

const sql = (): string => "select 1";
const blankSql = (): string => " \n";

const selfTest = (): void => {
  const valid = read("apps/chat/chat.config.ts");
  checkConfig(valid);
  const edit = (from: string | RegExp, to: string): string => {
    const changed = valid.replace(from, to);
    assert.notEqual(
      changed,
      valid,
      `self-test fixture unchanged: ${String(from)}`
    );
    return changed;
  };
  const configCases: readonly (readonly [string, RegExp])[] = [
    [
      edit(
        'appUrl: "https://chat.masonjames.com"',
        'appUrl: "https://example.com", // appUrl: "https://chat.masonjames.com"'
      ),
      /appUrl must be/u,
    ],
    [
      edit("appName:", 'appUrl: "https://chat.masonjames.com",\n  appName:'),
      /exactly one appUrl/u,
    ],
    [
      edit("github: false", "github: true"),
      /authentication\.github must be false/u,
    ],
    [
      edit("google: false", "google: true, // google: false"),
      /authentication\.google must be false/u,
    ],
    [
      edit("vercel: false", "vercel: false || true"),
      /authentication\.vercel must be false/u,
    ],
    [
      edit(
        /desktopApp:\s*\{\s*enabled:\s*false/u,
        "desktopApp: {\n    enabled: false ? false : true"
      ),
      /desktopApp\.enabled must be false/u,
    ],
    [edit("authentication: {", "auth: {"), /authentication block not found/u],
  ];
  for (const [source, message] of configCases) {
    expectFailure(() => {
      checkConfig(source);
    }, message);
  }
  const packageCases: readonly (readonly [string, RegExp])[] = [
    ["[]", /invalid manifest/u],
    ['{"dependencies":1}', /invalid manifest/u],
    ['{"dependencies":{"stripe":"1"}}', /dependencies: remove stripe/u],
    ['{"dependencies":{"resend":"1"}}', /remove resend/u],
    [
      '{"devDependencies":{"@tryghost/admin-api":"1"}}',
      /devDependencies: remove @tryghost\/admin-api/u,
    ],
  ];
  for (const [source, message] of packageCases) {
    expectFailure(() => {
      checkPackage(source);
    }, message);
  }
  for (const legacy of LEGACY_AUTH) {
    expectFailure(
      () => {
        checkAuth(`x ${legacy} y`);
      },
      new RegExp(`legacy auth found: ${legacy}`, "u")
    );
  }
  const journalCases: readonly (readonly [string, RegExp, () => string])[] = [
    ["[]", /invalid shape/u, sql],
    ['{"entries":[1]}', /invalid shape/u, sql],
    ['{"entries":[{"idx":"0","tag":"0000_a"}]}', /invalid shape/u, sql],
    ['{"entries":[{"idx":0,"tag":"../x"}]}', /invalid tag/u, sql],
    [
      '{"entries":[{"idx":1,"tag":"0001_a"},{"idx":0,"tag":"0002_b"}]}',
      /idx must increase at 0002_b/u,
      sql,
    ],
    [
      '{"entries":[{"idx":0,"tag":"0000_a"},{"idx":1,"tag":"0000_a"}]}',
      /duplicate tag 0000_a/u,
      sql,
    ],
    [
      '{"entries":[{"idx":0,"tag":"0000_a"}]}',
      /empty SQL for 0000_a/u,
      blankSql,
    ],
  ];
  for (const [source, message, readSql] of journalCases) {
    expectFailure(() => {
      checkJournal(source, readSql);
    }, message);
  }
  expectFailure(() => {
    checkDocument("docs/x.md", " \n");
  }, /empty document: docs\/x\.md/u);
  console.log("Fork contract self-test passed");
};

const main = (): void => {
  checkPackage(read("apps/chat/package.json"));
  checkConfig(read("apps/chat/chat.config.ts"));
  checkAuth(read("apps/chat/lib/auth.ts"));
  for (const path of DOCUMENTS) {
    checkDocument(path, read(path));
  }
  checkJournal(read(`${MIGRATIONS}/meta/_journal.json`), (tag) =>
    read(`${MIGRATIONS}/${tag}.sql`)
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
