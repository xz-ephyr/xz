# Settings + Chat UI Design Playbook (Based on Current Implementation)

This document captures repeatable design patterns used in the **Settings** and **Chat** experiences so future pages can match the same product style.

## 1) Shared visual language

- **Constrained content width**: primary content sits in centered containers (`max-w-[1300px]` for settings shell, `max-w-[720px]` to `max-w-[760px]` for chat reading/input width).
- **Soft neutral surfaces**: repeated light grays (`#f2f3f6`, `#f9f9f9`, muted borders) instead of high-contrast panels.
- **Low-radius rounded geometry**: common radii are `rounded-[6px]`, `rounded-[8px]`, `rounded-[12px]`.
- **Micro-motion**: fast transitions (`duration-150` to `duration-300`) and subtle state animations (`animate-fade-in`, dropdown slide/fade).
- **Typography hierarchy**:
  - Page/section titles: heavier bold, compact tracking.
  - Field labels: `text-sm` + medium weight.
  - Helper/meta text: `text-xs` muted.
  - Dense controls (chips/buttons): `text-[11px]` to `text-[13px]` + bold.

## 2) Settings page architecture (layout + panels)

## 2.1 Two-column split

Use a left fixed-width navigation and right fluid content panel:

- Left rail: `w-64 shrink-0`.
- Right pane: `flex-1` with generous inner padding (`p-10 pt-2`).
- Parent is borderless and airy (`min-h-[600px]`, overflow hidden, large bottom margin for scroll comfort).

This pattern creates a desktop “control center” feel instead of card-in-card clutter.

## 2.2 Tab navigation treatment

Settings tabs follow a compact-list control style:

- Dense stack (`gap-0.5`, `p-1`).
- Active tab uses filled neutral background (`bg-[#f2f3f6]`) + foreground text.
- Inactive tabs use muted text with soft hover tint (`hover:bg-[#f9f9f9]/60`).
- Rounded pill-like rows (`rounded-[6px]`) and slight press feedback (`active:scale-[0.98]`).

If recreating this elsewhere, prefer **single active row with soft fill** over outlined tabs.

## 2.3 Section composition rules

Each settings tab uses the same internal rhythm:

1. **Major section block** (`space-y-16` between major groups).
2. **Section title row** (`text-[16px] font-bold`).
3. **Rows** arranged with left descriptor + right control (`justify-between gap-4`).
4. **Optional helper line** under labels using muted `text-xs`.

This creates predictable scanning behavior across very different settings types.

## 2.4 Row/control design patterns to reuse

### A) Soft inline value pills

Used for email/subscription/value displays:
- `px-3 py-1.5`, neutral background, small bold text, optional icon left.

### B) Neutral input fields (not heavy outlined forms)

Input style prioritizes blended UI:
- background-only field (`bg-[#f2f3f6]`), no visible hard border (`border-0`), subtle hover darkening.
- compact height (`h-9`), medium rounding (`rounded-[8px]`).

### C) Segmented button groups

For 2–3 mode toggles (e.g., appearance):
- outer container soft gray + inner selected white chip with slight shadow.
- tiny icon + microtext for dense but readable choices.

### D) Dropdown overlays with click-away layer

Pattern:
- trigger button (chevron rotation on open),
- `fixed inset-0` backdrop for outside click,
- anchored absolute menu, white surface, shadow, tight options, checked state icon.

### E) Hover-revealed secondary actions

For crowded rows (provider key edit/delete):
- keep row clean by default,
- reveal action icons via `group-hover` / `group-focus-within`.

## 3) Chat page architecture (input + bubbles)

## 3.1 Vertical shell model

Chat follows a strict vertical stack:
1. top bar,
2. scrollable message region,
3. bottom input zone.

When conversation is empty, input appears inside message area under greeting; once messages exist, input docks to bottom. This preserves first-use onboarding while retaining normal chat ergonomics later.

## 3.2 Readability widths

- Message lane constrained near `max-w-[720px]` (bubbles/read actions).
- Outer message canvas at `max-w-[760px]`.
- Bottom input also constrained to `max-w-[720px]`.

Use these widths consistently so eye movement and input/message alignment remain stable.

## 3.3 Bubble language

### Assistant bubble
- Rendered mostly as **text without a heavy container** (`px-0 py-1`).
- Feels editorial/flowing, less boxed.
- Supports streaming text and “thinking” placeholder.

### User bubble
- Rendered as **soft contained block** (`bg-[#f9f9f9]`, `rounded-[8px]`, padded).
- Long user text gets capped height with gradient fade + chevron expansion.

This asymmetry clearly communicates speaker roles while keeping the UI minimal.

## 3.4 Message action placement

- Assistant actions (copy/regenerate/feedback) live **below** assistant output.
- User actions (edit/copy) live as a **hover-revealed side rail** near the bubble.

Pattern principle: keep primary read surface clean; expose controls contextually.

## 3.5 Input component anatomy

Main chat input is a 2-part module:

1. **Primary card**
   - rounded 12px white surface with thin border + tiny elevation,
   - auto-growing textarea (min 44px, max 180px),
   - bottom toolbar for add/send/actions.

2. **Secondary under-panel** (empty-state only)
   - attached slab under card (`border-t-0`, slight negative overlap),
   - model picker dropdown.

When conversation is active, this secondary panel is removed and model name appears as a compact chip next to send controls.

## 3.6 Input state behavior standards

- Enter sends; Shift+Enter inserts newline.
- Disabled/generating state lowers interactivity + opacity.
- Character counter appears only after long text threshold.
- Focus state strengthens border/shadow subtly, not dramatically.
- Disclaimer text appears in active-chat mode beneath input.

## 4) Implementation checklist for future similar pages

Use this quick checklist when building future UI in this style:

- [ ] Constrain widths (`~720px` conversation lane, larger settings shell).
- [ ] Prefer neutral filled surfaces over heavy outlines.
- [ ] Use 6/8/12px rounding system consistently.
- [ ] Keep section spacing generous (`space-y-6/8/16` hierarchy).
- [ ] Pair each row: left context text, right control/value.
- [ ] Reveal low-priority actions on hover/focus instead of always-visible clutter.
- [ ] Add micro-animations to dropdowns/state changes.
- [ ] Preserve role asymmetry in chat bubbles (assistant plain, user softly boxed).
- [ ] Keep input auto-grow and small stateful affordances (counter, model chip, stop/send state).

## 5) Reuse recommendations (component strategy)

To build matching designs faster in the future, extract/standardize these primitives:

- `SettingsSplitLayout` (left nav + right pane shell)
- `SettingsSection` (title + content spacing)
- `SettingsRow` (label/help left + control right)
- `SoftPill` (value display chip)
- `SoftInput` (neutral filled text input)
- `DropdownSurface` (trigger + overlay + menu)
- `ChatLane` (max width wrappers)
- `UserBubble` / `AssistantMessageBlock`
- `ChatComposer` (main card + optional under-panel)

If these primitives remain visually opinionated (same radii/colors/spacing), new features will naturally stay on-brand.
