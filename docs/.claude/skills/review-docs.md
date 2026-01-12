# Documentation Review & Fix Skill

Review and **fix** all documentation issues. Only report issues requiring human decisions.

## Action Principle

**FIX immediately (don't report):**
- Typos, grammar, formatting
- Broken internal links (verify path exists, fix it)
- Outdated code with obvious correct version (check src/)
- Missing imports in code examples
- Unclear phrasing with obvious improvement
- Inconsistent terminology
- Dead external links (remove or update)
- Incorrect file paths in examples

**REPORT only (needs human decision):**
- Architectural decisions needed
- Missing sections requiring domain knowledge
- Conflicting info needing clarification from maintainer
- Features that may/may not exist in codebase
- Content that might be intentionally placeholder

## Execution Strategy

### Phase 1: Foundation (Sequential)

Review and fix Getting Started docs in order:

```
docs/index.mdx -> docs/quickstart.mdx -> docs/project-structure.mdx
```

These build on each other - fixes in earlier docs inform later ones.
After Phase 1, compress context: list only unfixed issues + summary of fixes made.

### Phase 2: Core Concepts (Sequential)

```
docs/core/configuration.mdx -> docs/core/authentication.mdx -> docs/core/multi-model.mdx
```

After Phase 2, compress context.

### Phase 3: Independent Groups (Parallel Agents)

Spin up 4 parallel agents. Each agent should:
1. Read all assigned files
2. Check code examples against actual src/ files
3. Fix all fixable issues using Edit tool
4. Return only: files edited + issues needing human decision

**Agent 1 - AI Capabilities:**
- docs/capabilities/overview.mdx
- docs/capabilities/web-search.mdx
- docs/capabilities/code-execution.mdx
- docs/capabilities/image-generation.mdx
- docs/capabilities/attachments.mdx
- docs/capabilities/mcp.mdx

**Agent 2 - Customization:**
- docs/customization/theming.mdx
- docs/customization/branding.mdx
- docs/customization/component-registries.mdx
- docs/customization/models.mdx
- docs/customization/prompts.mdx

**Agent 3 - Deployment:**
- docs/deployment/vercel.mdx
- docs/deployment/docker.mdx
- docs/deployment/self-hosted.mdx

**Agent 4 - Reference:**
- docs/reference/config.mdx
- docs/reference/database.mdx
- docs/reference/routing.mdx
- docs/reference/evaluations.mdx

Wait for all agents, compress findings.

### Phase 4: Roadmap (Parallel - independent future features)

4 parallel agents, one per file:
- docs/roadmap/canvas.mdx
- docs/roadmap/sharing.mdx
- docs/roadmap/branching.mdx
- docs/roadmap/projects.mdx

### Phase 5: Cookbook (Parallel Agents)

**Agent 5 - Cookbook Index + Streaming:**
- docs/cookbook/index.mdx
- docs/cookbook/streaming/resumable-streams.mdx
- docs/cookbook/streaming/tool-part.mdx

**Agent 6 - Data:**
- docs/cookbook/data/provisional-ids.mdx
- docs/cookbook/data/credit-tracking.mdx
- docs/cookbook/data/neon-branching.mdx

**Agent 7 - Auth:**
- docs/cookbook/auth/better-auth-setup.mdx
- docs/cookbook/auth/dev-auth-bypass.mdx

**Agent 8 - AI UX:**
- docs/cookbook/ai-ux/follow-up-questions.mdx
- docs/cookbook/ai-ux/chat-layout.mdx

## Agent Prompt Template

```
Review and FIX documentation files. You have Edit tool access.

Files: [list]

For each file:
1. Read completely
2. Check code examples against src/ - use Grep/Glob to find actual implementations
3. FIX immediately: typos, broken links, outdated code, formatting, unclear phrasing
4. Use Edit tool to make all fixes
5. Only REPORT issues needing human decision (architectural, ambiguous, domain-specific)

Return format:
FIXED: [list of files edited with 1-line summary each]
NEEDS DECISION: [only issues you couldn't fix, with context]
```

## Final Report Format

Only issues needing human decision:

```markdown
## Documentation Review Complete

### Fixes Applied
- X files edited
- [1-line summary per file]

### Needs Human Decision

#### [filename.mdx]
- **Issue**: [description]
- **Context**: [why you couldn't auto-fix]
- **Options**: [if applicable]
```

## Context Management

- After each phase: discard file contents, keep only fix summary + open issues
- Agents return compressed output only
- No raw content between phases
- Final report is just: what was fixed + what needs decision
