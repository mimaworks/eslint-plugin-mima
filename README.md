# eslint-plugin-mima

ESLint rules for detecting unattested AI SDK calls in TypeScript and JavaScript.

Catches AI library calls that are not wrapped with `mima.wrap()` at lint time — in your editor and in CI, before they reach production.

## Install

```bash
npm install --save-dev eslint-plugin-mima
```

## Configure

### ESLint flat config (ESLint 8+)

```javascript
// eslint.config.js
import mima from 'eslint-plugin-mima';

export default [
  {
    plugins: { mima },
    rules: {
      'mima/no-unattested-ai-call': 'error',
    },
  },
];
```

### Legacy `.eslintrc`

```json
{
  "plugins": ["mima"],
  "rules": {
    "mima/no-unattested-ai-call": "error"
  }
}
```

Or use the built-in configs:

```javascript
// eslint.config.js
import mima from 'eslint-plugin-mima';

export default [
  mima.configs.recommended,  // warn
  // or:
  mima.configs.strict,       // error
];
```

## What it flags

```typescript
// Error — unattested OpenAI call
const response = await openai.chat.completions.create({ ... });

// Error — unattested Anthropic call
const msg = await anthropic.messages.create({ ... });
```

```typescript
// OK — wrapped with mima
const generate = mima.wrap('generate', async (prompt: string) => {
  return await openai.chat.completions.create({ ... });
});
```

## AI libraries covered

| Library | Methods flagged |
|---|---|
| `openai` | `chat.completions.create`, `completions.create` |
| `@anthropic-ai/sdk` | `messages.create`, `messages.stream` |
| `@google/generative-ai` | `generateContent`, `generateContentStream` |
| `@azure/openai` | `getChatCompletions`, `streamChatCompletions` |
| `ai` (Vercel AI SDK) | `generateText`, `streamText`, `generateObject`, `streamObject` |
| `langchain` / `@langchain/core` | `invoke`, `stream`, `batch` |
| `cohere-ai` | `chat`, `generate`, `embed` |
| `@mistralai/mistralai` | `chat`, `chatStream` |

## CI integration

```yaml
# .github/workflows/lint.yml
- name: Lint
  run: npx eslint src --ext .ts,.tsx
```

Non-zero exit on violations blocks the merge.

## Inline disable

For intentional unattested calls (health-check pings, etc.):

```typescript
// eslint-disable-next-line mima/no-unattested-ai-call
const ping = await openai.models.list();
```

## Relationship to other Mima tools

| Layer | When | What it catches |
|---|---|---|
| ESLint plugin | Lint time / editor | Statically detectable unattested calls |
| `mima scan` | CLI / CI | All AI call sites via AST, any library |
| `mima.wrap()` | Runtime | Forces wrapping at the call site |

The ESLint plugin is the earliest signal. Use all three for defence-in-depth.

## Links

- [Full ESLint plugin docs](https://docs.mima.ai/eslint)
- [TypeScript SDK](https://docs.mima.ai/typescript)
- [mima.ai](https://mima.ai)
