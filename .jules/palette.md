## 2025-05-14 - [Accessibility] Icon-only Button Labels
**Learning:** Icon-only buttons in the sidebar and chat bubbles were missing ARIA labels and tooltips, making them inaccessible to screen readers and less intuitive for sighted users.
**Action:** Always provide descriptive `aria-label` and `title` attributes for all icon-only interactive elements to ensure accessibility and better user feedback.

## 2025-05-15 - [Accessibility/Safety] Semantic Buttons and Form Safety
**Learning:** Converting non-semantic elements (like `div`) to `button` for keyboard accessibility requires an explicit `type="button"`. Without it, browsers default to `type="submit"`, which can cause accidental form submissions if the component is ever wrapped in a `<form>`.
**Action:** Always specify `type="button"` for all interactive buttons that are not explicitly intended to submit a form.
