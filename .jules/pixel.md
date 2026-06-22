# Pixel's Journal - UI Quality Enforcer

## 2025-05-14 - Chat Interface Polish & Accessibility
**Learning:** Tables in chat bubbles often break layouts on mobile due to `whitespace-nowrap`. Likewise, "hover-only" visibility for actions (like Copy) makes them inaccessible on touch devices. Reversing the thinking pad's gradient mask was necessary to prioritize the most recent (bottom) tokens during streaming.
**Action:** Use `whitespace-normal` for table cells in chat. Use `md:opacity-0` for hover-based actions to ensure they remain visible on mobile. Ensure all icon buttons have `type="button"` and ARIA labels.
