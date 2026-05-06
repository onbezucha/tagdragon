# Contributing to TagDragon

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Development Setup

**Requirements:** Node.js 18+, Chrome 102+

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
| `npm run test` | Vitest run all tests (83 test files) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage report |
| `npm run analyze` | Build with bundle visualizer → opens `dist/stats.html` |
| `npm run generate-icons` | Regenerate extension icons |
| `npm run generate-provider-icons` | Regenerate provider icons |

## Adding a New Provider

1. **Create a provider file** in `src/providers/<category>/<name>.ts` (or flat file for non-vendor-specific providers):

```ts
import type { Provider } from '@/types/provider';

export const myProvider: Provider = {
  name: 'My Provider',
  color: '#FF5733',
  pattern: /myprovider\.com\/track/,
  parseParams: (url, body) => {
    // return Record<string, string> of decoded params
    return {};
  },
};
```

2. **Register it** in `src/providers/index.ts` — import and add to the `PROVIDERS` array (order matters: first match wins, more specific patterns before broad ones).

3. **Add parameter categories** (optional) in `src/shared/categories/<group>/` — create a file with parameter metadata for the decoded view.

4. **Assign a category group** in `src/shared/provider-groups.ts` — add the provider name to the correct group.

5. **Write tests** — create `tests/providers/<name>.test.ts` with pattern matching and param parsing tests. See existing test files for reference.

6. **Test manually** — load the extension, open a page that fires the tracker, verify it appears in TagDragon.

## Code Style

- **TypeScript strict mode** — no `any` unless unavoidable (Chrome API edge cases)
- **Single quotes**, 2-space indent, semicolons — enforced by Prettier
- **No production dependencies** — all logic must be self-contained
- **HTML escaping** — always use `esc()` from `src/panel/utils/format.ts` for user-visible strings
- **Named exports only** — no default exports
- **Path aliases** — use `@/*` to reference `src/*`
- **Comment headers** — use `═══` for major sections, `───` for subsections

Full conventions are documented in `JEAN.md`.

## Testing

The project uses Vitest with 83 test files covering:

- **Provider matching** — pattern tests and URL parsing for all 67 providers
- **DevTools** — network capture, panel bridge, data layer relay
- **Panel/DataLayer** — diff renderer, correlation, validator, e-commerce formatter, changed-paths
- **Content scripts** — data sanitization
- **Shared utilities** — e-commerce detection, HTTP utils, ID generation, provider groups

Run tests:
```bash
npm run test              # Run all
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

## Pre-commit Hooks

After `npm install`, Husky is set up automatically. Each commit runs:
- `eslint` on staged `.ts` files
- `prettier --write` on staged `.ts` files

## CI Pipeline

GitHub Actions runs on every push/PR to master:
1. ESLint check
2. Prettier format check
3. TypeScript type-check (`tsc --noEmit`)
4. Vitest tests
5. Production build
6. Verify dist files exist

## Pull Request Guidelines

- One feature/fix per PR
- Describe what the change does and why
- For new providers: include the provider's tracking domain and a brief description in the PR body
- Add tests for new functionality
- CI must pass (lint + format check + type-check + test + build)

## Reporting Issues

Use the GitHub issue templates:
- **Bug report** — unexpected behaviour in the extension
- **Feature request** — new functionality
- **New provider** — request support for an analytics/marketing tool
