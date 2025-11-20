<div align="center">

<img src="public/icon.svg" alt="Sparka AI" width="64" height="64">

# Production-Ready AI Chat Template

Build your own multi-model AI chat app with 120+ models, authentication, streaming, and advanced features.

**Next.js 15 • Vercel AI SDK • Shadcn/UI • Better Auth • Drizzle ORM**

[**Live Demo**](https://sparka.ai)

</div>

![sparka_gif_demo](https://github.com/user-attachments/assets/34a03eed-58fa-4b1e-b453-384351b1c08c)

Ship a full-featured AI chat in minutes with Claude, GPT-4, Gemini, Grok, and 120+ models through Vercel AI Gateway.

## Stack

- [Next.js 16](https://nextjs.org) - App Router, React Server Components
- [TypeScript](https://www.typescriptlang.org) - Full type safety
- [Vercel AI SDK v5](https://sdk.vercel.ai) - Unified AI provider integration with 120+ models
- [Better Auth](https://www.better-auth.com) - Authentication & authorization
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe database queries
- [PostgreSQL](https://www.postgresql.org) - Primary database
- [Redis](https://redis.io) - Caching & resumable streams
- [Vercel Blob](https://vercel.com/storage/blob) - Blob storage
- [Shadcn/UI](https://ui.shadcn.com) - Beautiful, accessible components
- [Tailwind CSS 4](https://tailwindcss.com) - Styling
- [tRPC](https://trpc.io) - End-to-end type-safe APIs
- [Zod 4](https://zod.dev) - Schema validation
- [Zustand](https://docs.pmnd.rs/zustand) - State management
- [Motion](https://motion.dev) - Animations
- [t3-env](https://env.t3.gg) - Environment varia[](https://www.ultracite.ai/)bles
- [Pino](https://getpino.io) - Structured Logging
- [Langfuse](https://langfuse.com) - LLM observability & analytics
- [Vercel Analytics](https://vercel.com/analytics) - Web analytics
- [Biome](https://biomejs.dev) - Code linting and formatting
- [Ultracite](https://ultracite.ai) - Biome preset for humans and AI
- [Streamdown](https://streamdown.ai/) - Markdown for AI streaming
- [AI Elements](https://ai-sdk.dev/elements/overview) - AI-native Components
- [AI SDK Tools](https://ai-sdk-tools.dev/) - Developer tools for AI SDK

## Features

- 🤖 **120+ AI Models** - Claude, GPT-5, Gemini, Grok via Vercel AI Gateway
- 🔐 **Auth & Sync** - Secure authentication with cross-device chat history
- 🎯 **Try Without Signup** - Guest access for instant demos
- 📎 **Attachments** - Images, PDFs, documents in conversations
- 🎨 **Image Generation** - AI-powered image creation and editing
- 💻 **Syntax Highlighting** - Code formatting for all languages
- 🔄 **Resumable Streams** - Continue after interruptions
- 🌳 **Chat Branching** - Alternative conversation paths
- 🔗 **Chat Sharing** - Share conversations with others
- 🔭 **Deep Research** - Real-time web search with citations
- ⚡ **Code Execution** - Secure Python/JavaScript sandboxes
- 📄 **Document Creation** - Generate docs, spreadsheets, presentations

## Quick Start

1. **Clone and Install**

   ```bash
   git clone https://github.com/franciscomoretti/sparka.git
   cd sparka
   bun install
   ```

2. **Environment Setup**

   ```bash
   cp .env.example .env.local
   ```

   Refer to `.env.example` for more instructions.

   **Required:**

   - `DATABASE_URL` - Database connection
   - `AI_GATEWAY_API_KEY` - Vercel AI Gateway
   - `BLOB_READ_WRITE_TOKEN` - Vercel Blob read/write token
   - `CRON_SECRET` - Cron job authentication
   - `AUTH_SECRET` - Better Auth secret
   - One auth provider (choose one pair):
     - `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`
     - `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`

   **Optional:**

   - `REDIS_URL` - For resumable streams
   - `OPENAI_API_KEY` - Direct OpenAI access
   - `TAVILY_API_KEY` - Web search
   - `EXA_API_KEY` - Web search
   - `FIRECRAWL_API_KEY` - Web scraping
   - `SANDBOX_TEMPLATE_ID` - Code execution
   - `E2B_API_KEY` - E2B Code Interpreter
   - `LANGFUSE_PUBLIC_KEY` - Observability (Langfuse)
   - `LANGFUSE_SECRET_KEY` - Observability (Langfuse)
   - `LANGFUSE_BASE_URL` - Langfuse base URL (optional)
   - `VERCEL_URL` - Deployment URL
   - `VERCEL_PROJECT_PRODUCTION_URL` - Production URL override

3. **Database Setup**

   ```bash
   bun run db:migrate
   ```

4. **Development Server**
   ```bash
   bun dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to start building.

## Deploy Your Own

[![Deploy with Vercel](https://vercel.com/button)](<https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffranciscomoretti%2Fsparka&project-name=sparka-ai&repo-name=sparka&env=DATABASE_URL,AI_GATEWAY_API_KEY,AUTH_SECRET,BLOB_READ_WRITE_TOKEN,AUTH_GOOGLE_ID,AUTH_GOOGLE_SECRET,AUTH_GITHUB_ID,AUTH_GITHUB_SECRET,REDIS_URL,OPENAI_API_KEY,TAVILY_API_KEY,EXA_API_KEY,FIRECRAWL_API_KEY,SANDBOX_TEMPLATE_ID,E2B_API_KEY,LANGFUSE_PUBLIC_KEY,LANGFUSE_SECRET_KEY,LANGFUSE_BASE_URL&envDescription=Required%3A%20DATABASE_URL%2C%20AI_GATEWAY_API_KEY%2C%20AUTH_SECRET%2C%20BLOB_READ_WRITE_TOKEN.%20Auth%3A%20set%20at%20least%20one%20provider%20pair%20(Google%20or%20GitHub)%20%E2%80%94%20AUTH_GOOGLE_ID%2FAUTH_GOOGLE_SECRET%20or%20AUTH_GITHUB_ID%2FAUTH_GITHUB_SECRET&envLink=https%3A%2F%2Fgithub.com%2Ffranciscomoretti%2Fsparka%2Fblob%2Fmain%2F.env.example>)
