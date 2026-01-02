<div align="center">

<img src="public/icon.svg" alt="ChatJS" width="64" height="64">

# ChatJS

Ship AI chat apps 10x faster with battle-tested patterns and a production-ready starter.

**Next.js • Vercel AI SDK • Shadcn/UI • Better Auth • Drizzle ORM**

[**Documentation**](https://chatjs.dev) · [**Live Demo**](https://chatjs.dev/demo)

</div>

<br />

> ⚠️ **Active Development**: This project is under active maintenance with frequent updates. Expect occasional breaking changes until the first stable release.

<br />

## Two Ways to Use ChatJS

1. **Patterns** — Reusable solutions for complex AI chat functionality. Copy-paste implementations for tools, streaming, branching, and more.

2. **Start** — Full-featured starter app. Clone, configure, deploy. Auth, 120+ models, attachments, and tools included.

## Features

- 🤖 **120+ AI Models** — Claude, GPT, Gemini, Grok via Vercel AI Gateway
- 🔐 **Auth & Sync** — Secure authentication with cross-device chat history
- 🎯 **Try Without Signup** — Guest access for instant demos
- 📎 **Attachments** — Images, PDFs, documents in conversations
- 🎨 **Image Generation** — AI-powered image creation
- 💻 **Syntax Highlighting** — Code formatting for all languages
- 🔄 **Resumable Streams** — Continue after interruptions
- 🌳 **Chat Branching** — Alternative conversation paths
- 🔗 **Chat Sharing** — Share conversations with others
- 🔭 **Deep Research** — Real-time web search with citations
- ⚡ **Code Execution** — Secure Python/JavaScript sandboxes
- 📄 **Document Creation** — Generate docs, spreadsheets, presentations

## Stack

- [Next.js 16](https://nextjs.org) — App Router, React Server Components
- [TypeScript](https://www.typescriptlang.org) — Full type safety
- [Vercel AI SDK v5](https://sdk.vercel.ai) — Unified AI provider integration with 120+ models
- [Better Auth](https://www.better-auth.com) — Authentication & authorization
- [Drizzle ORM](https://orm.drizzle.team) — Type-safe database queries
- [PostgreSQL](https://www.postgresql.org) — Primary database
- [Redis](https://redis.io) — Caching & resumable streams
- [Vercel Blob](https://vercel.com/storage/blob) — Blob storage
- [Shadcn/UI](https://ui.shadcn.com) — Beautiful, accessible components
- [Tailwind CSS 4](https://tailwindcss.com) — Styling
- [tRPC](https://trpc.io) — End-to-end type-safe APIs

## Quick Start

```bash
git clone https://github.com/franciscomoretti/chatjs.git
cd chatjs
bun install
cp .env.example .env.local
bun db:migrate
bun dev
```

Visit [http://localhost:3000](http://localhost:3000) to start building.

## Documentation

Full documentation available at [chatjs.dev](https://chatjs.dev) or in [docs/](docs/):

- [Quickstart](docs/quickstart.mdx) — Installation and setup
- [Configuration](docs/configuration.mdx) — Feature toggles via lib/config.ts
- [Features](docs/features/overview.mdx) — Built-in functionality
- [Patterns](docs/patterns/overview.mdx) — Reusable implementations

## Environment Variables

### Required

- `DATABASE_URL` — PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token
- `AUTH_SECRET` — [Generate one](https://generate-secret.vercel.app/32)
- `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` — AI Gateway access

### Auth Provider (choose one)

- `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET`
- `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`

### Optional

- `REDIS_URL` — Resumable streams
- `TAVILY_API_KEY` — Web search
- `OPENAI_API_KEY` — Direct OpenAI access
- `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` — Observability

## License

Apache-2.0
