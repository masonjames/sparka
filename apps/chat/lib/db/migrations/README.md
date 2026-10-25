# EVE-only database baseline

`0000_eve_baseline.sql` is the complete schema for a new ChatJS database. It contains authentication, credits, projects, model preferences, MCP, and EVE runtime tables. It intentionally excludes the retired Chat, Message, Part, Vote, Document, Suggestion, and GenerationCancellation tables.

The migration runner accepts an empty database or a database already initialized with this exact baseline. It rejects earlier or modified Drizzle histories before running SQL. This keeps existing isolated development databases and their EVE data untouched.

To move to this baseline, back up the existing database and provision a fresh empty database. Point both `DATABASE_URL` and `DATABASE_MIGRATION_URL` at the new database, then run `bun db:migrate`. Keep the old database available with the Git revision that created it if its EVE data must be exported later. Do not rewrite `drizzle.__drizzle_migrations` or drop the old database as a migration shortcut.

## Migration 0021: guest balance removal

`0021_glorious_chameleon` drops four guest message-balance columns. Older app and worker versions still read or update them. This migration requires a coordinated rollout and is not safe during a rolling deployment.

Every migration invocation stops before applying any pending migrations when an existing database still needs 0021, unless the operator explicitly passes `--coordinated`. This covers Vercel, Render build scripts, and setup commands. An empty database can initialize normally. After the migration has been applied explicitly, deployment builds resume normally.

For an existing production database, prepare the matching app and worker revision, back up the database, stop incoming traffic, and drain older app and worker processes. Run `bun db:migrate --coordinated` explicitly against that database, then deploy the matching app and worker and restore traffic. Do not resume an older revision against the migrated schema. Preview databases must remain isolated from production.
