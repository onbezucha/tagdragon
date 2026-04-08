# Contributing to TagDragon

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

**Requirements:** Node.js 18+, Chrome 88+

```bash
git clone https://github.com/onbezucha/tagdragon.git
cd tagdragon
npm install
npm run dev        # watch mode (CSS + JS)
```

Load the extension in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the repo folder
4. Open DevTools on any page → **TagDragon** tab

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode — rebuilds CSS + JS on changes |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier auto-format |
| `npm run format:check` | Prettier check (used in CI) |
| `npm run analyze` | Build with bundle visualizer → opens `dist/stats.html` |
| `npm run generate-icons` | Regenerate provider icons from Lucide |

## Adding a New Provider

1. **Create a provider file** in `src/providers/<category>/<name>.ts`:

```ts
import type { Provider } from '@/types/provider';

export const MyProvider: Provider = {
  name: 'My Provider',
  domains: [/myprovider\.com/],
  decode: (request) => {
    // return Record<string, string> of decoded params
    return {};
  },
};
```

2. **Register it** in `src/providers/index.ts` — import and add to the `PROVIDERS` array.

3. **Assign a category group** in `src/shared/provider-groups.ts` — add the provider name to the correct group.

4. **Test manually** — load the extension, open a page that fires the tracker, verify it appears in TagDragon.

See existing providers in `src/providers/` for reference. Simple providers (URL-parameter based) are just a few lines.

## Code Style

- **TypeScript strict mode** — no `any` unless unavoidable (Chrome API edge cases)
- **Single quotes**, 2-space indent, semicolons — enforced by Prettier
- **No production dependencies** — all logic must be self-contained
- **HTML escaping** — always use `esc()` from `src/panel/utils/format.ts` for user-visible strings

Full conventions are documented in `AGENTS.md`.

## Pre-commit Hooks

After `npm install`, Husky is set up automatically. Each commit runs:
- `eslint` on staged `.ts` files
- `prettier --write` on staged `.ts` files

## Pull Request Guidelines

- One feature/fix per PR
- Describe what the change does and why
- For new providers: include the provider's tracking domain and a brief description in the PR body
- CI must pass (lint + format check + build)

## Reporting Issues

Use the GitHub issue templates:
- **Bug report** — unexpected behaviour in the extension
- **Feature request** — new functionality
- **New provider** — request support for an analytics/marketing tool
