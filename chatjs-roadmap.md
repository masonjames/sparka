# ChatJS Roadmap

## Vision

Help devs/companies launch AI chat apps 10x faster through:

- **Patterns**: Reusable solutions for complex functionality (cookbook-like)
- **Features**: Turn-key functionality in the starter app
- **Components** (post-launch): Shadcn-style installable pieces

---

## Core Value

**Need solved**: Devs want AI chat features but don't want to solve streaming, tools, attachments, branching, auth, credits etc. from scratch.

**AHA moment**: "I added a working AI tool with UI in 5 minutes" or "I launched a full chat app by changing config"

---

## Launch MVP

### 1. Rebrand

- [ ] Rename everywhere (repo, package.json, config, README, UI)
- [ ] Landing page with 2 pillars: Patterns + Start
- [ ] Domain + socials
- [ ] Email addresses in (legal@chatjs.dev, privacy@chatjs.dev)

### 2. Patterns Docs

- [ ] Docs site scaffold
- [ ] 3-5 documented patterns (see structure below)

### 3. Features Docs

- [ ] Document each built-in feature

### 4. Start

- [ ] Current repo as the starter
- [ ] `lib/config.ts` as feature toggle hub
- [ ] Clean README pointing to docs

---

## Post-Launch

- [ ] Components (shadcn-style CLI distribution)
- [ ] Config-driven code elimination (tree-shake unused features)
- [ ] More patterns
- [ ] MCP integration patterns

---

## Docs Structure

```
docs/
├── index.md                     # Landing / what is ChatJS
├── getting-started/
│   ├── index.md                 # Quick overview
│   ├── installation.md          # Clone, env setup, run
│   └── configuration.md         # lib/config.ts walkthrough
│
├── patterns/
│   ├── index.md                 # What are patterns, how to use
│   ├── follow-up-suggestions.md
│   ├── resumable-streams.md
│   ├── credit-tracking.md
│   ├── tool-execution.md
│   └── chat-branching.md
│
├── features/
│   ├── index.md                 # Feature overview / what's included
│   ├── multi-model.md           # 120+ models, model switching
│   ├── authentication.md        # Better Auth, providers, anonymous mode
│   ├── attachments.md           # Images, PDFs, documents
│   ├── image-generation.md      # AI image creation
│   ├── code-execution.md        # Sandbox (Python/JS)
│   ├── web-search.md            # Tavily/Exa integration
│   ├── document-creation.md     # Artifacts / generated docs
│   ├── chat-sharing.md          # Public share links
│   ├── projects.md              # Project organization + instructions
│   └── mcp.md                   # MCP connector support
│
├── start/
│   ├── index.md                 # What you get out of the box
│   ├── architecture.md          # App structure, key files
│   ├── customization.md         # Theming, adding models, modifying prompts
│   └── deployment.md            # Vercel, self-hosted
│
└── reference/
    ├── config.md                # Full config.ts API
    ├── database-schema.md       # Drizzle schema overview
    └── api.md                   # /api/chat contract
```

---

## Pattern Doc Template

```md
# Pattern Name

> One-liner description

## Overview

What it does + why you'd want it. 2-3 sentences max.

## How it works

Concept explanation with inline snippets showing the flow.
Sections are dynamic based on what the pattern touches (no forced backend/frontend split).

## Code

Full copy-paste blocks with file paths. Complete, working code - no ellipsis.
Agent-ready: humans or AI can copy directly to implement.

\`\`\`tsx title="components/example.tsx"
// Complete file or standalone snippet
\`\`\`
```

---

## Patterns to Document

| Pattern               | Scope           | Description                                    |
| --------------------- | --------------- | ---------------------------------------------- |
| Tool execution        | Full-stack      | Tool def → part renderer                       |
| Follow-up suggestions | Full-stack      | Generation in route.ts → hook → UI             |
| Chat layout           | Frontend        | Resizable main + secondary panel               |
| Resumable streams     | Backend + Infra | Redis setup, reconnection, state recovery      |
| Credit tracking       | Backend + DB    | Reservation before call, finalization after    |
| Chat branching        | Frontend + DB   | Tree structure, parent refs, thread navigation |

---

## Features to Document

| Feature           | Config key                      | Description                            |
| ----------------- | ------------------------------- | -------------------------------------- |
| Multi-model       | `models`                        | 120+ models, runtime switching         |
| Authentication    | `auth`                          | Better Auth, providers, anonymous mode |
| Attachments       | `attachments`                   | Images, PDFs, documents                |
| Image generation  | `integrations.imageGeneration`  | AI image creation                      |
| Code execution    | `integrations.sandbox`          | Python/JS sandbox                      |
| Web search        | `integrations.webSearch`        | Tavily/Exa                             |
| Document creation | `integrations.documentCreation` | Artifacts                              |
| Chat sharing      | `sharing`                       | Public share links                     |
| Projects          | `projects`                      | Organization + instructions            |
| MCP               | `integrations.mcp`              | MCP connector                          |

---

## Launch Scope

| Must have            | Nice to have            | Post-launch             |
| -------------------- | ----------------------- | ----------------------- |
| Rebrand complete     | 5 patterns documented   | CLI for components      |
| Landing page         | Interactive demos       | Code tree-shaking       |
| 2-3 core patterns    | All features documented | Full component registry |
| Getting started docs |                         |                         |
