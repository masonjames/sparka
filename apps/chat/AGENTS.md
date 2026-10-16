# Chat application instructions

These instructions apply to this application directory.

## Stack and structure

- Use Next.js App Router, React, the Vercel AI SDK, Tailwind CSS 4, and shadcn/ui.
- Keep shadcn primitives in `components/ui`; its config is `components.json`.
- EVE is the only chat runtime. Browser commands enter through `app/api/eve/[...path]/route.ts`; agent hooks and tools live in `agent/`.
- Keep Drizzle schema in `lib/db/schema.ts` and database operations in `lib/db/queries.ts`.
- Register every tRPC router in `trpc/routers/_app.ts`.

## Commands

- Type-check with `bun test:types`; do not use a production build as a type check.
- Run `bun lint` after TypeScript, React, JSON, or CSS changes.
- For authenticated browser testing, visit `/api/dev-login` on the discovered local app URL before testing.

## Visual coverage

- Every page and every state of a page (empty, error, signed in or out, an open dialog) has a UI Verify capture in `tests/visual/pages/*.browser.tsx`. A new page or a new state gets its capture in the same change.
- The tests render the real route files, layouts included, through `renderRoute` in `tests/visual/pages/render.tsx`, and each page is captured at desktop and mobile in light and dark once it settles, as the registry's tool stories are. Pass `viewports: ["desktop"]` only for a state that looks the same as another one on a phone.
- `tests/visual/pages/setup.tsx` uses the registry's visual harness (`packages/registry/src/tools/_shared/visual.tsx`: global CSS, Geist, the motion freeze) and doubles the `next/*` modules, auth, the route files' server reads (`route.server`), tRPC answered from per-test fixtures (`route.trpc`), and replayed EVE transcripts (`route.transcripts`) against a frozen clock. Add data to `tests/visual/pages/fixtures.ts`; a procedure without a fixture fails loudly.
- Assert the content that makes the state distinct before the test ends; a heading the loading skeleton also shows proves nothing.
- Run `bun test:visual:chat`, then `bun uiverify:upload:chat` with `UIVERIFY_API_KEY` set to the chat project's key. CI does both in `.github/workflows/uiverify-chat.yml`, reading the key from the `UIVERIFY_CHAT_API_KEY` secret.
- `tests/visual/pages/coverage.test.ts` runs with the unit tests and fails when a route file has no visual test. It checks files, not states.

## Database changes

1. Change `lib/db/schema.ts`.
2. Run `bun db:generate`.
3. Review the generated migration.
4. Run `bun db:migrate` only when applying the migration is in scope.

## Environment and configuration

- Define and access environment variables through `lib/env.ts`; prefer `env.VAR_NAME` over `process.env.VAR_NAME` in application code.
- Keep feature flags and integration configuration in `lib/config.ts`.
- When a feature requires environment variables, add matching validation to `scripts/check-env.ts`.

## TypeScript and React

- Avoid `any` and type assertions, including `as unknown as`. Fix the types instead of suppressing them.
- Do not create barrel files. Use direct imports and named exports.
- Define one-off object parameter types inline on the function instead of creating a separate interface.
- Use function components and keep non-interactive work in Server Components. Add `"use client"` only for interactive components.
- Follow the Rules of Hooks; never call hooks conditionally or in loops.
- Derive values instead of duplicating them in state. Keep effects narrowly focused on side effects.
- Use `react-hook-form` with Zod and shadcn Form primitives for non-trivial forms. Co-locate schemas that are not reused.
- Prefer responsive Tailwind classes over JavaScript viewport checks when CSS can express the behavior.
- Use the shared `cn` helper for conditional classes.

## Code quality

- Use `const` by default, `for...of` for iteration, optional chaining, nullish coalescing, and descriptive names instead of magic values.
- Await promises and handle errors deliberately. Do not use async promise executors or `done` callbacks.
- Prefer early returns and named conditions over deeply nested logic or nested ternaries.
- Keep regular expressions at module scope when reused or evaluated in loops.
- Avoid spread-based accumulators in loops.
- Remove `console.log`, `debugger`, and `alert` from production code.
- Use semantic HTML, meaningful alt text, proper headings, input labels, and keyboard support for interactive elements. Add `rel="noopener"` with `target="_blank"`.
- Avoid `dangerouslySetInnerHTML`, `eval`, and direct `document.cookie` assignments unless the task explicitly requires and secures them.
- Use Next.js `Image` instead of raw `img` elements.
- Keep test assertions inside test cases. Do not commit `.only` or `.skip`.
- Run `bun lint` to inspect formatting and lint failures, or `bun format` when formatting changes are in scope.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
