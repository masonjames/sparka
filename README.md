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

- **Next.js 15** - App Router, React Server Components
- **TypeScript** - Full type safety
- **Vercel AI SDK v5** - Unified AI provider integration with 120+ models
- **Better Auth** - Authentication & authorization
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Primary database
- **Redis** - Caching & resumable streams
- **Vercel Blob** - Blob storage
- **Shadcn/UI** - Beautiful, accessible components
- **Tailwind CSS 4** - Styling
- **tRPC** - End-to-end type-safe APIs
- **Zod 4** - Schema validation
- **Zustand** - State management
- **Motion** - Animations
- **t3-env** - Environment variables
- **Pino** - Structured Logging
- **Biome** - Code linting and formatting
- **Streamdown** - Markdown for AI streaming
- **AI Elements** - AI-native Components
- **AI SDK Tools** - Developer tools for AI SDK

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
- 📊 **Analytics** - Vercel Web Analytics ready

## Quick Start

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database (required)
- Vercel AI Gateway (required)
- Google + GitHub OAuth (required)
- Vercel Blob (required)
- Redis (optional, for resumable streams)

### Setup

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
   
   **Required:**
   - `POSTGRES_URL` - Database connection
   - `AI_GATEWAY_API_KEY` - Vercel AI Gateway
   - `BLOB_READ_WRITE_TOKEN` - Vercel Blob read/write token
   - `CRON_SECRET` - Cron job authentication
   - `AUTH_SECRET` - Better Auth secret
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` - GitHub OAuth
   
   **Optional:**
   - `REDIS_URL` - For resumable streams
   - `OPENAI_API_KEY` - Direct OpenAI access
   - `TAVILY_API_KEY` - Web search
   - `EXA_API_KEY` - Web search
   - `FIRECRAWL_API_KEY` - Web scraping
   - `SANDBOX_TEMPLATE_ID` - Code execution

3. **Database Setup**
   ```bash
   bun run db:migrate
   ```

4. **Development Server**
   ```bash
   bun dev
   ```

Visit [http://localhost:3000](http://localhost:3000) to start building.


