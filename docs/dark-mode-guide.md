# Dark Mode Guide — Conventions & Rules

> **Date:** 2026-06-27
> **Goal:** Prevent color bloat, mismatch, and inconsistency when adding dark mode support to any component.

---

## Core Philosophy

**Every element gets exactly TWO color definitions: one light, one dark.** No more, no less. If a color doesn't change between light and dark, use neither (inherit from parent).

```
✅  text-neutral-600 dark:text-neutral-300
✅  bg-white dark:bg-[#111110]
✅  border-neutral-200 dark:border-neutral-700
❌  text-neutral-600 dark:text-neutral-300 dark:bg-neutral-800  (extra unrelated dark prop)
❌  text-neutral-600 text-neutral-700 dark:text-neutral-300      (duplicate light prop)
```

---

## Approved Color Map

These are the **only** dark mode color pairs to use. Anything outside this list needs review.

### Backgrounds

| Light | Dark | Usage |
|-------|------|-------|
| `bg-white` | `dark:bg-[#111110]` | App root, chat pages, main content areas |
| `bg-transparent` | `dark:bg-transparent` | See-through containers (doesn't change) |
| `bg-white` | `dark:bg-[#1a1a1a]` | Artifact panel, code editor |
| `bg-neutral-50` | `dark:bg-neutral-900` | Cards, code blocks, preview wrappers |
| `bg-neutral-50` | `dark:bg-neutral-800` | Modal sections, settings rows, secondary cards |
| `bg-neutral-100` | `dark:bg-neutral-800` | Tertiary surfaces, hover states, button bg |
| `bg-neutral-100` | `dark:bg-neutral-700` | Active tab, selected state, toggle bg |
| `bg-neutral-200` | `dark:bg-neutral-700` | Dividers, disabled states, skeleton |
| `bg-red-50` | `dark:bg-red-900/20` | Error container backgrounds |
| `bg-red-100` | `dark:bg-red-800` | Error button backgrounds |
| `bg-blue-50` | `dark:bg-blue-900/20` | Info container backgrounds |

### Text

| Light | Dark | Usage |
|-------|------|-------|
| `text-black` | `dark:text-white` | Primary body text, headings |
| `text-neutral-900` | `dark:text-neutral-100` | Body text, strong emphasis |
| `text-neutral-800` | `dark:text-neutral-200` | Secondary headings, labels |
| `text-neutral-700` | `dark:text-neutral-300` | Tertiary text, settings labels |
| `text-neutral-600` | `dark:text-neutral-400` | Muted text, descriptions |
| `text-neutral-500` | `dark:text-neutral-400` | Placeholder text, metadata |
| `text-neutral-400` | `dark:text-neutral-500` | Disabled text, timestamp labels |
| `text-gray-400` | `dark:text-neutral-400` | Model name labels (legacy, migrate to neutral) |
| `text-gray-600` | `dark:text-neutral-300` | Icon default colors |
| `text-blue-600` | `dark:text-blue-400` | Link text |
| `text-blue-700` | `dark:text-blue-400` | Info text, secondary links |
| `text-red-600` | `dark:text-red-400` | Error message text |
| `text-red-700` | `dark:text-red-300` | Error button text |
| `text-red-800` | `dark:text-red-300` | Error title text |
| `text-green-600` | `dark:text-green-400` | Success indicators |

### Borders / Rings

| Light | Dark | Usage |
|-------|------|-------|
| `border-neutral-200` | `dark:border-neutral-700` | Default borders, card outlines |
| `border-neutral-300` | `dark:border-neutral-600` | Stronger borders (inputs, focus) |
| `border-red-200` | `dark:border-red-800` | Error borders |
| `border-black` | `dark:border-white/20` | Focus rings, active outlines |

### Fill / Stroke (SVGs)

| Rule | Example |
|------|---------|
| Never hardcode SVG fill/stroke colors | Always use `stroke="currentColor"` + `text-*` / `dark:text-*` |
| Icon inherits from parent text color | `<HugeiconsIcon icon={...} className="text-neutral-500 dark:text-neutral-400" />` |

---

## The `dark:` Modifier Rules

### Rule 1: Always pair, never orphan

Every `dark:` modifier must have a corresponding light variant on the same element.

```
✅  text-neutral-600 dark:text-neutral-300   (paired)
✅  bg-white dark:bg-[#111110]               (paired)
❌  dark:text-neutral-300                     (missing light variant)
❌  text-neutral-600                          (missing dark variant — unless color doesn't change)
```

### Rule 2: Use Tailwind semantic classes over arbitrary values

```
✅  dark:bg-neutral-800
❌  dark:bg-[#1c1c1c]     (arbitrary value, not in palette)
❌  dark:bg-[#262626]     (use neutral-800 instead)
```

**Exceptions** (approved arbitrary dark values):

| Arbitrary Value | Reason |
|----------------|--------|
| `dark:bg-[#111110]` | App background — unique to xz brand, matches `--background` |
| `dark:bg-[#1a1a1a]` | Code editor background — darker than neutral-900 |
| `dark:border-white/20` | Focus ring on dark — replaces `border-black` |

### Rule 3: No dark variants for non-color utilities

Do NOT add `dark:` to layout, spacing, sizing, opacity (unless for a color), or animation utilities.

```
✅  dark:bg-neutral-800     (color change)
❌  dark:p-4                (spacing — never changes in dark mode)
❌  dark:flex               (layout — never changes)
❌  dark:w-full             (sizing — never changes)
```

### Rule 4: Prefer `dark:` on the parent over children

If a parent container changes background in dark mode, its children likely don't need explicit `dark:` text colors — they inherit unless they need to contrast differently.

```tsx
// ✅ Parent sets dark background, children inherit
<div className="bg-neutral-50 dark:bg-neutral-900">
  <p className="text-neutral-900 dark:text-neutral-100">Title</p>
</div>

// ❌ Unnecessary — use parent instead
<div className="bg-neutral-50">
  <p className="text-neutral-900 dark:text-neutral-100">Title</p>
</div>
```

---

## The `group-hover` / `hover:` Dark Pattern

When adding hover states, dark hover variants must also be paired:

```tsx
<button className="hover:bg-neutral-100 dark:hover:bg-neutral-800
                   active:bg-neutral-200 dark:active:bg-neutral-700" />
```

| State | Light | Dark |
|-------|-------|------|
| Default | `bg-white` | `dark:bg-[#111110]` |
| `hover:` | `hover:bg-neutral-100` | `dark:hover:bg-neutral-800` |
| `active:` | `active:bg-neutral-200` | `dark:active:bg-neutral-700` |
| `focus-visible:` | `focus-visible:bg-neutral-100` | `dark:focus-visible:bg-neutral-800` |

---

## Shimmer / Animation Colors

These stay the same in light and dark mode (they use raw CSS, not Tailwind):

| Element | Light | Dark | Notes |
|---------|-------|------|-------|
| `.thinking-shimmer-text` | gradient `#a1a1aa` → `#d4d4d8` | same | Animated text shimmer |
| TitleBar shimmer | `from-neutral-300 via-neutral-200 to-neutral-300` | same | Placeholder loading |

---

## Semantic Color Groups

When adding a new UI element, pick the right level:

### Layer Hierarchy

```
Layer 0 (bg):    bg-white dark:bg-[#111110]          ← App root
Layer 1 (card):  bg-neutral-50 dark:bg-neutral-900   ← Elevated card, modal
Layer 2 (inner): bg-neutral-100 dark:bg-neutral-800  ← Inner container, input bg
Layer 3 (hover): hover:bg-neutral-100 dark:hover:bg-neutral-800
Layer 4 (active):active:bg-neutral-200 dark:active:bg-neutral-700
```

### Text Hierarchy

```
Level 1 (primary):   text-neutral-900 dark:text-neutral-100
Level 2 (secondary): text-neutral-800 dark:text-neutral-200
Level 3 (tertiary):  text-neutral-700 dark:text-neutral-300
Level 4 (muted):     text-neutral-500 dark:text-neutral-400
Level 5 (disabled):  text-neutral-400 dark:text-neutral-500
```

---

## Adding Dark Mode to a New Component — Checklist

1. **Check parent context** — does the parent already set dark bg/text? If yes, child may not need `dark:` at all.
2. **Map every color** — every `text-*`, `bg-*`, `border-*`, `ring-*` needs a `dark:` counterpart.
3. **Use the approved map** — don't invent new dark shades.
4. **No orphan `dark:` modifiers** — every `dark:` must have a light pair.
5. **No dark spacing/sizing/layout** — only color utilities change.
6. **Check hover/focus/active** — three states all need dark variants.
7. **Test both modes** — toggle the `.dark` class on `<html>` and verify.

---

## Quick Reference Card

```tsx
// Most common patterns — copy/paste these:

// App-level container
className="bg-white dark:bg-[#111110]"

// Card / modal
className="bg-white dark:bg-[#111110] border border-neutral-200 dark:border-neutral-700"

// Input / textarea
className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700
           text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500"

// Button (primary)
className="bg-black dark:bg-white text-white dark:text-black
           hover:bg-neutral-800 dark:hover:bg-neutral-200"

// Button (secondary)
className="bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
           hover:bg-neutral-200 dark:hover:bg-neutral-700"

// Link
className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"

// Error state
className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
           text-red-800 dark:text-red-300"

// Disabled
className="text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
```

---

## When to Use CSS Variables vs Tailwind `dark:`

| Approach | When to Use |
|----------|------------|
| `var(--background)` / `bg-background` | App-level theming (global bg/foreground). Already defined in `tailwind.config.js`. |
| `dark:bg-neutral-900` | Component-specific surfaces (cards, buttons, inputs). Prefer this. |
| `dark:bg-[#111110]` | Only for the exact app background color. Do NOT use arbitrary values for anything else. |

---

## Migration Checklist (Existing Components)

When refactoring a component that has incomplete dark mode:

1. Add missing `dark:` modifiers from the approved map
2. Remove orphan `dark:` modifiers (missing light pair)
3. Replace arbitrary dark values with Tailwind palette (`dark:bg-neutral-800` not `dark:bg-[#262626]`)
4. Verify hover/active/focus all have dark variants
5. Remove `dark:` from non-color utilities
