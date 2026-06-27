# Semantic Theming — Migration Plan

> **Date:** 2026-06-27
> **Goal:** Eliminate all hardcoded `dark:` color variants by switching to CSS variable tokens.

---

## The Problem

Currently every component hardcodes light colors and duplicates them with `dark:` variants:

```tsx
<div className="bg-white dark:bg-[#111110] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-700" />
```

This causes:
- Bloated JSX (every element has 2x the color utilities)
- Missed variants → broken components in dark mode
- Inconsistent colors across the app
- Impossible to add new themes

---

## The Solution: Semantic CSS Variable Tokens

Replace hardcoded colors with **semantic tokens** defined as CSS variables. The `.dark` class swaps all variable values at once — no `dark:` needed on individual elements.

```tsx
<div className="bg-background text-foreground border-border" />
```

When `.dark` toggles, the CSS variables update, and every component follows automatically.

---

## Architecture

```
index.css
  ├── :root        → light values for ALL tokens
  └── .dark        → dark values for ALL tokens
         │
         ▼
tailwind.config.js → maps var(--token) → Tailwind utility
         │
         ▼
Components         → use bg-background, text-foreground, etc.
                    → NO dark: color variants
```

---

## Token Map

### Backgrounds

| Current (light) | Current (dark) | Semantic Token |
|----------------|----------------|----------------|
| `bg-white` | `bg-[#111110]` | `bg-background` |
| `bg-neutral-50` | `bg-neutral-900` | `bg-muted` |
| `bg-neutral-100` | `bg-neutral-800` | `bg-muted` / `bg-card` |
| `bg-neutral-200` | `bg-neutral-700` | `bg-accent` |
| `bg-[#fafafa]` / `bg-[#f2f3f6]` | `bg-[#1a1a18]` | `bg-muted` |
| `bg-red-50` | `bg-red-900/20` | `bg-destructive/10` |
| `bg-blue-50` | `bg-blue-900/20` | `bg-info/10` |

### Text

| Current (light) | Current (dark) | Semantic Token |
|----------------|----------------|----------------|
| `text-neutral-900` | `text-neutral-100` | `text-foreground` |
| `text-neutral-800` | `text-neutral-200` | `text-foreground` |
| `text-neutral-700` | `text-neutral-300` | `text-card-foreground` |
| `text-neutral-600` | `text-neutral-400` | `text-muted-foreground` |
| `text-neutral-500` | `text-neutral-400` | `text-muted-foreground` |
| `text-neutral-400` | `text-neutral-500` | `text-muted-foreground/70` |

### Borders

| Current (light) | Current (dark) | Semantic Token |
|----------------|----------------|----------------|
| `border-neutral-200` | `border-neutral-700` | `border-border` |
| `border-neutral-100` | `border-neutral-800` | `border-border/50` |
| `border-red-200` | `border-red-800` | `border-destructive/30` |

### Sidebar

| Current (light) | Current (dark) | Semantic Token |
|----------------|----------------|----------------|
| `bg-white` | `bg-[#111110]` | `bg-sidebar` |
| `border-[#e5e5e5]` | `border-[#2a2a28]` | `border-sidebar` |
| `hover:bg-[#e5e5e5]` | `hover:bg-[#2a2a28]` | `hover:bg-sidebar-accent` |
| `hover:bg-[#f2f3f6]` | `hover:bg-[#1a1a18]` | `hover:bg-sidebar-accent/50` |

---

## Implementation Order

### Phase 1: Define CSS Variables

`index.css`:
- Add all missing `--card`, `--muted`, `--accent`, `--border`, `--sidebar`, etc. to `:root`
- Add corresponding dark values in `.dark`

### Phase 2: Wire Tailwind Config

`tailwind.config.js`:
- Already maps background/foreground/border/sidebar etc. to CSS vars — verify all exist
- Add any missing mappings (e.g. `info`, `warning` semantic colors)

### Phase 3: Migrate Components (one by one)

Replace hardcoded colors with semantic tokens. Start with the most-used components:

```
Priority 1 (high impact, few files):
  ├── ChatPage → bg-background, text-foreground
  ├── ChatsPage → bg-background, text-foreground
  ├── Sidebar → bg-sidebar, border-sidebar
  └── SettingsModal → bg-background, text-foreground, border-border

Priority 2 (medium impact):
  ├── AssistantBubble
  ├── UserBubble
  ├── ChatInput
  ├── MarkdownMessage
  └── ArtifactPanel

Priority 3 (low impact):
  ├── Onboarding components
  ├── Toast / UpdateModal
  ├── CopyButton / Table / CodeBlock
  └── Preview components (HtmlPreview, SvgPreview, etc.)
```

### Phase 4: Remove dead `dark:` variants

After all components are migrated, strip every `dark:` color variant from the codebase.

---

## Migration Rules

1. **One token per component, not one per element** — parent sets the bg, children inherit
2. **No new `dark:` color variants** — if it needs to change in dark mode, it needs a semantic token
3. **Exceptions only for non-color utilities** — `dark:` is still allowed for `dark:sr-only` etc.
4. **Arbitrary values only for unique cases** — `dark:bg-[#1a1a1a]` only if no token fits

---

## CSS Variable Definitions to Add

These will go in `index.css`:

```css
:root {
  --background: #ffffff;
  --foreground: #141413;
  --card: #fafafa;
  --card-foreground: #262626;
  --muted: #f5f5f5;
  --muted-foreground: #737373;
  --accent: #e5e5e5;
  --accent-foreground: #171717;
  --border: #e5e5e5;
  --input: #e5e5e5;
  --ring: #141413;
  --radius: 0.5rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #141413;
  --sidebar-accent: #f2f3f6;
  --sidebar-accent-foreground: #141413;
  --sidebar-border: #e5e5e5;
  --info: #3b82f6;
  --info-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
}

.dark {
  --background: #111110;
  --foreground: #faf9f5;
  --card: #1a1a1a;
  --card-foreground: #d4d4d4;
  --muted: #1a1a18;
  --muted-foreground: #a3a3a3;
  --accent: #2a2a28;
  --accent-foreground: #faf9f5;
  --border: #404040;
  --input: #404040;
  --ring: #faf9f5;
  --sidebar: #111110;
  --sidebar-foreground: #faf9f5;
  --sidebar-accent: #1a1a18;
  --sidebar-accent-foreground: #faf9f5;
  --sidebar-border: #2a2a28;
  --info: #60a5fa;
  --info-foreground: #111110;
  --destructive: #f87171;
  --destructive-foreground: #111110;
}
```

---

## Verification

After migration:
1. Toggle dark mode in Settings
2. Check every view: Chat, Chats list, Settings, Sidebar, Onboarding
3. Check every overlay: Toast, UpdateModal, dropdowns
4. No element should stay white in dark mode or black in light mode
