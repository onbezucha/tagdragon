# Spec: Provider Icons in Info Popover — "Supported Platforms"

**Version:** 1.0  
**Date:** 2025-07-10  
**Scope:** Replace colored dots with brand icons in the info popover's "📦 Supported platforms" section. Replace group emoji with SVG group icons.

---

## 1. Goal

In the info popover (`#info-popover`), the "📦 Supported platforms" section currently shows providers as pills with a **colored dot** (`.info-pill-dot`, 6×6 px). Replace these dots with the **same brand icons** used in the Provider Filter popover (`.ppill-icon`), sized **14×14 px**.

Additionally, replace **group emoji** (📊, 🏷️, 🎯, etc.) in group labels with the **SVG group icons** from `GROUP_ICONS` (already used in provider-bar as `.pgroup-icon`, 12×12 px).

---

## 2. Current State

### Provider pills (info-popover.ts:97–102)
```typescript
const pills = group.providers.map(name => {
  const color = colorMap.get(name) ?? '#888';
  return `<span class="info-provider-pill" data-name="${esc(name)}">` +
    `<span class="info-pill-dot" style="background:${color}"></span>${esc(name)}</span>`;
}).join('');
```

### Group labels (info-popover.ts:104–108)
```html
<div class="info-provider-group-label">
  ${group.label}
  <span class="info-provider-group-count">${group.providers.length}</span>
</div>
```

### Existing icon system (already used in provider-bar)

| Utility | File | Purpose |
|---------|------|---------|
| `buildGroupIcon(provider)` | `src/panel/utils/provider-icon.ts` | Returns SVG string: provider icon → group icon → group emoji fallback |
| `getCachedIcon(provider)` | `src/panel/utils/provider-icon.ts` | Returns cached `DocumentFragment` with parsed SVG |
| `PROVIDER_ICONS` | `src/panel/utils/provider-icons.ts` | 69 brand icons (base64 PNG in SVG wrapper, viewBox 0 0 24 24) |
| `GROUP_ICONS` | `src/panel/utils/group-icons.ts` | 9 group icons (SVG with `currentColor`, viewBox 0 0 16 16) |

### Existing CSS reference (provider-bar)

```css
/* .ppill-icon — 14×14 brand icon in provider filter pill */
.ppill-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  transition: filter 150ms var(--ease), opacity 150ms var(--ease);
}
.ppill-icon svg {
  width: 14px;
  height: 14px;
}

/* .pgroup-icon — 12×12 group icon in provider filter header */
.pgroup-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  color: var(--text-2);
  margin-left: 2px;
}
.pgroup-icon svg {
  width: 12px;
  height: 12px;
}
```

---

## 3. Changes

### 3.1. `src/panel/components/info-popover.ts`

#### 3.1.1. Add imports (top of file)

Add two new imports alongside the existing ones:

```typescript
import { buildGroupIcon } from '../utils/provider-icon';
import { GROUP_ICONS } from '../utils/group-icons';
```

#### 3.1.2. Modify `renderProviderGroups()` (lines 88–113)

Replace the entire function body with icon-aware rendering:

**Before:**
```typescript
function renderProviderGroups(): void {
  const $container = DOM.infoProviderGroups;
  if (!$container) return;

  const colorMap = new Map<string, string>();
  for (const p of PROVIDERS) {
    colorMap.set(p.name, p.color);
  }

  $container.innerHTML = PROVIDER_GROUPS.map(group => {
    const pills = group.providers.map(name => {
      const color = colorMap.get(name) ?? '#888';
      return `<span class="info-provider-pill" data-name="${esc(name)}">` +
        `<span class="info-pill-dot" style="background:${color}"></span>${esc(name)}</span>`;
    }).join('');

    return `
      <div class="info-provider-group" data-group="${group.id}">
        <div class="info-provider-group-label">
          ${group.label}
          <span class="info-provider-group-count">${group.providers.length}</span>
        </div>
        <div class="info-provider-pills">${pills}</div>
      </div>
    `;
  }).join('');
}
```

**After:**
```typescript
function renderProviderGroups(): void {
  const $container = DOM.infoProviderGroups;
  if (!$container) return;

  const colorMap = new Map<string, string>();
  for (const p of PROVIDERS) {
    colorMap.set(p.name, p.color);
  }

  $container.innerHTML = PROVIDER_GROUPS.map(group => {
    const pills = group.providers.map(name => {
      const color = colorMap.get(name) ?? '#888';
      const icon = buildGroupIcon(name);
      const visual = icon
        ? `<span class="info-pill-icon">${icon}</span>`
        : `<span class="info-pill-dot" style="background:${color}"></span>`;
      return `<span class="info-provider-pill" data-name="${esc(name)}">` +
        `${visual}${esc(name)}</span>`;
    }).join('');

    const groupIcon = GROUP_ICONS[group.id] ?? '';

    return `
      <div class="info-provider-group" data-group="${group.id}">
        <div class="info-provider-group-label">
          ${groupIcon ? `<span class="info-group-icon">${groupIcon}</span>` : ''}
          ${esc(group.label)}
          <span class="info-provider-group-count">${group.providers.length}</span>
        </div>
        <div class="info-provider-pills">${pills}</div>
      </div>
    `;
  }).join('');
}
```

**Key changes:**
- Provider pills: `buildGroupIcon(name)` returns SVG string (provider icon → group icon → group emoji). If present, render inside `.info-pill-icon` span. Otherwise, fall back to `.info-pill-dot` with provider color.
- Group labels: `GROUP_ICONS[group.id]` returns SVG string. If present, render inside `.info-group-icon` span before the label text.
- The `colorMap` is still built but only used as fallback for providers without any icon (extremely rare — `buildGroupIcon` always returns at least the group emoji).

### 3.2. `public/panel.html`

#### 3.2.1. Add `.info-pill-icon` CSS (after `.info-pill-dot`, line 3332)

Insert immediately after the existing `.info-pill-dot` rule block:

```css
.info-pill-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.info-pill-icon svg {
  width: 14px;
  height: 14px;
}
```

#### 3.2.2. Add `.info-group-icon` CSS (after `.info-provider-group-label`, line 3250)

Insert immediately after the existing `.info-provider-group-label` rule block:

```css
.info-group-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  color: var(--text-2);
}

.info-group-icon svg {
  width: 12px;
  height: 12px;
}
```

#### 3.2.3. Keep `.info-pill-dot` CSS (no changes)

The `.info-pill-dot` rule stays unchanged — it serves as fallback for the extremely rare case where `buildGroupIcon()` returns empty string (no provider icon, no group, no group icon). In practice, all 69 providers have at least a group icon fallback.

---

## 4. Design Decisions

### Why `buildGroupIcon()` instead of `getCachedIcon()`?

- `renderProviderGroups()` is called **once** when the info popover opens. No repeated renders.
- `buildGroupIcon()` returns a raw SVG string that can be embedded directly in the template literal — no post-insert DOM iteration needed.
- `getCachedIcon()` returns a `DocumentFragment` which requires `appendChild` after `innerHTML` is set — unnecessary complexity for a one-time render.

### Why not reuse `.ppill-icon` / `.pgroup-icon` CSS classes directly?

- `.ppill-icon` has `transition` properties and is targeted by `.ppill.active` / `.ppill.inactive` state rules (grayscale filter, opacity). These don't apply in the info popover context.
- Separate `.info-pill-icon` / `.info-group-icon` classes keep concerns isolated and avoid unintended side effects if provider-bar CSS evolves.

### Why 14×14 for provider icons?

Matches the existing `.ppill-icon` size in the provider filter popover — consistent visual weight across both popovers.

### Why 12×12 for group icons?

Matches the existing `.pgroup-icon` size in the provider filter popover.

### Dark mode compatibility

- **Provider icons** (`PROVIDER_ICONS`): base64 PNG in SVG wrapper. Same rendering as in provider-bar — works on both themes because `.info-provider-pill` has `background: var(--bg-2)` + `border: 1px solid var(--border)`, providing sufficient contrast. No special CSS filter needed.
- **Group icons** (`GROUP_ICONS`): SVG with `currentColor`. Automatically adapts to dark/light theme via `color: var(--text-2)` on `.info-group-icon`.

---

## 5. Files Modified

| File | Change | Lines affected |
|------|--------|---------------|
| `src/panel/components/info-popover.ts` | Add 2 imports + rewrite `renderProviderGroups()` body | Lines 3–4 (imports), 88–113 (function) |
| `public/panel.html` | Add `.info-pill-icon` CSS (~6 lines) | After line 3332 |
| `public/panel.html` | Add `.info-group-icon` CSS (~8 lines) | After line 3250 |

**No new files created. No files deleted.**

---

## 6. Testing Checklist

- [ ] Open DevTools → Info popover → "📦 Supported platforms" section
- [ ] Verify provider pills show **brand icons** (14×14 px) instead of colored dots
- [ ] Verify group labels show **SVG icons** (12×12 px) instead of emoji
- [ ] Verify fallback: if any provider has no icon at all, colored dot is shown
- [ ] Verify **search** still works (type in "Search providers…" input)
- [ ] Verify **light theme** — icons visible, group icons use `--text-2` color
- [ ] Verify **dark theme** — icons visible on `--bg-2` pill background, group icons adapt
- [ ] Verify **accordion** expand/collapse still works for the section
- [ ] Compare visual appearance with Provider Filter popover — icons should look identical
- [ ] Verify `npm run build` completes without errors
