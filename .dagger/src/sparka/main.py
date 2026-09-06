import re
from typing import Annotated

import dagger
from dagger import DefaultPath, Ignore, dag, function, object_type

SOURCE_EXCLUDES = [
    ".git", ".claude", ".codex", "**/node_modules", "**/.next", "**/.turbo", "**/.env*",
    "**/.vercel", "**/.neon", "**/*.pem", "**/*.key", "**/*.tsbuildinfo",
    ".dagger", "artifacts", "**/dist", "**/coverage",
    "**/test-results", "**/playwright-report", "**/.DS_Store",
]
Source = Annotated[dagger.Directory, DefaultPath("."), Ignore(SOURCE_EXCLUDES)]
PLATFORM = dagger.Platform("linux/amd64")
REPOSITORY = "https://github.com/masonjames/sparka.git"
IMAGE = "ghcr.io/masonjames/sparka"


@object_type
class Sparka:
    @function
    async def check(self, source: Source) -> str:
        """Run fork invariants, thread/chat unit tests, and monorepo types."""
        await source.docker_build(platform=PLATFORM, target="check").sync()
        await self.migrations(source)
        return "passed"

    @function
    async def migrations(self, source: Source) -> str:
        """Rehearse the production upgrade on disposable PostgreSQL, then rerun it."""
        database = (
            dag.container().from_("postgres:17.6-bookworm")
            .with_env_variable("POSTGRES_PASSWORD", "disposable-test-only")
            .with_exposed_port(5432).as_service()
        )
        await (
            source.docker_build(platform=PLATFORM, target="source")
            .with_service_binding("database", database)
            .with_env_variable("DATABASE_URL", "postgresql://postgres:disposable-test-only@database:5432/postgres")
            .with_env_variable("MIGRATION_TEST_DISPOSABLE", "1")
            .with_exec(["node", "apps/chat/scripts/test-migrations.cjs"])
            .sync()
        )
        return "passed"

    @function
    def build(self, source: Source) -> dagger.Container:
        """Build the production linux/amd64 image without production credentials."""
        return source.docker_build(platform=PLATFORM, target="runner")

    @function
    async def smoke(self, source: Source) -> str:
        """Boot the real image with a disposable database and probe public/auth routes."""
        database = (
            dag.container().from_("postgres:17.6-bookworm")
            .with_env_variable("POSTGRES_PASSWORD", "disposable-test-only")
            .with_env_variable("POSTGRES_DB", "sparka_smoke")
            .with_exposed_port(5432).as_service()
        )
        app = (
            self.build(source).with_service_binding("database", database)
            .with_env_variable("DATABASE_URL", "postgresql://postgres:disposable-test-only@database:5432/sparka_smoke")
            .with_env_variable("AUTH_SECRET", "disposable-smoke-auth-secret-32-characters")
            .with_env_variable("APP_BASE_URL_OVERRIDE", "http://app:3000")
            .with_env_variable("STRIPE_SECRET_KEY", "sk_test_disposable_fixture")
            .with_env_variable("STRIPE_WEBHOOK_SECRET", "whsec_disposable_fixture")
            .with_exposed_port(3000).as_service()
        )
        await (
            dag.container().from_("node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94")
            .with_service_binding("app", app)
            .with_exec(["node", "--input-type=module", "-e", """
import assert from 'node:assert/strict';
for (const path of ['/', '/login', '/favicon.ico']) {
  const response = await fetch(`http://app:3000${path}`);
  assert.equal(response.status, 200, path);
}
const session = await fetch('http://app:3000/api/auth/get-session');
assert.equal(session.status, 200);
assert.equal(await session.json(), null);
const webhook = await fetch('http://app:3000/api/webhooks/stripe', {method: 'POST', body: '{}'});
assert.equal(webhook.status, 401, 'unsigned Stripe webhook');
console.log('Image startup, public routes, assets, session and webhook boundary passed');
"""])
            .sync()
        )
        return "passed"

    @function
    async def publish(
        self, revision: str, registry_username: str, registry_token: dagger.Secret
    ) -> str:
        """Check and publish an exact committed revision; never deploy to Dokploy."""
        if not re.fullmatch(r"[0-9a-f]{40}", revision):
            raise ValueError("revision must be a full Git commit SHA")
        source = dag.git(REPOSITORY).commit(revision).tree()
        # Apply exclusions to remote sources as well as local directories.
        source = dag.directory().with_directory(".", source, exclude=SOURCE_EXCLUDES)
        await self.check(source)
        await self.smoke(source)
        image = self.build(source).with_label("org.opencontainers.image.source", REPOSITORY)
        image = image.with_label("org.opencontainers.image.revision", revision)
        reference = await image.with_registry_auth(
            "ghcr.io", registry_username, registry_token
        ).publish(f"{IMAGE}:sha-{revision}")
        digest = reference.rsplit("@", 1)[-1]
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", digest):
            raise ValueError("registry did not return an immutable digest")
        return f"{IMAGE}@{digest}"
