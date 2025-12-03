---
description: Fetch latest AI Gateway models and sync schema
---

Sync the AI models from the Vercel AI Gateway and update the schema if needed.

## Steps

1. Run `bun run scripts/fetch-models.ts` to fetch the latest models from the AI Gateway
2. Check for type errors in `lib/ai/models.generated.ts` using `bun test:types`
3. If there are errors, update the schema in `lib/ai/ai-gateway-models-schemas.ts` to match the new model structure:
   - Add any new fields to the `pricing` object
   - Add any new values to the `type` union
   - Add any new fields to the `tags` union
   - Add any new optional fields that appear in the response
4. Re-run `bun test:types` to confirm the errors are fixed
