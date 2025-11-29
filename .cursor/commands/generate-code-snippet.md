---
description: Generate a shareable code snippet image via ray.so
---

Create a code snippet for sharing on Twitter/X and generate a ray.so URL.

Requirements:

- **Max 15 lines** of code (fits nicely in a tweet image)
- **One clear concept** per snippet
- Start with a `// Comment` explaining the benefit/concept
- Use real imports and realistic code
- Keep it self-contained and easy to understand at a glance
- No types that require context to understand
- Prefer hooks and patterns that show elegance

Output format:

1. Show the code snippet in a code block
2. Base64 encode using this command:
   ```bash
   echo 'YOUR_CODE_HERE' | base64 -w 0 | sed 's/+/-/g; s/\//_/g; s/=//g'
   ```
3. Generate a ray.so URL with these params:
   ```
   https://www.ray.so/#code={base64}&theme=vercel&darkMode=true&padding=64&language=typescript
   ```
4. Output the full URL

**Note**: ray.so uses localStorage which can override URL params. Open in incognito if the code doesn't load.

The snippet should make developers think "oh that's nice" when they see it.
