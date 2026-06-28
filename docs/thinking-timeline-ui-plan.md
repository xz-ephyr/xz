# Thinking Timeline UI — Design & Implementation Plan

> **Date:** 2026-06-28
> **Status:** Design Draft
> **Icons:** `Clock01Icon` (thinking), `InternetIcon` (search)

---

## 1. My Understanding

The AI model's response process is a **flexible sequence of steps** — it can think, search, think again, search more, and finally respond. We want to visualize this process as a **vertical timeline** inside the assistant bubble, showing each step with its own icon, title, and expandable content.

### Step types

| Step | Icon | Title | Content |
|------|------|-------|---------|
| **Thinking** | `Clock01Icon` (existing) | "Thinking..." / "Thought for Xs" | Sentences of reasoning text (expandable) |
| **Searching** | `InternetIcon` (new) | `Searching: "search term"` | While running: row of source URLs being fetched. When done: same row with results count. |

### Possible flows

```
Think ──→ Search ──→ Think ──→ Search ──→ Think ──→ ✅ Done
Think ──→ Search × 3 concurrent ──→ Think ──→ ✅ Done
Think ──→ Search ──→ ✅ Done
Search ──→ Think ──→ Search ──→ ✅ Done
```

The timeline must be **completely flexible** — it simply renders whatever sequence of steps the model produces, in order, with a connecting line.

---

## 2. What Exists Today (AssistantBubble.tsx)

Current state:
- **Thinking/reasoning panel**: A `ThoughtLabel` with expand/collapse, clock icon, vertical line, and sentence-based reasoning text. Looks quite close to what we want.
- **Tool invocation pills**: Small badges showing "running"/"done" shimmer text + filename. **This is the "running text rill" you want removed.**
- **WriteArtifact shimmer**: Separate from search, stays as-is.
- **No sources display**: Search results URLs are never shown in the UI.

What needs to change:
1. **Replace** the tool-invocation pill badges with a proper **timeline entry** for search steps.
2. **Merge** the existing reasoning panel into the same timeline as a "thinking" step.
3. **Add** a collapsible sources list for search steps that shows:
   - While searching: "Fetching from example.com, docs.example.org, ..."
   - When done: a list of source URLs
4. **After streaming**: Aggregate all unique source URLs next to the model label (up to 4 visible, remainder as `+N` bubble).

---

## 3. Design Mockup (Text)

```
┌─────────────────────────────────────────────┐
│  ● ClockIcon                                 │
│  │  Thinking 3s                              │
│  │  [Reasoning sentence 1...                 │
│  │   Reasoning sentence 2...]                │
│  │                                           │
│  ● InternetIcon                              │
│  │  Searching: "react hooks tutorial"        │
│  │  [Fetching from: ○ react.dev ○ www.w3schools.com ...]  ← while running
│  │  [Sources: ○ react.dev ○ www.w3schools.com ○ +3]       ← when done
│  │                                           │
│  ● ClockIcon                                 │
│  │  Thinking 2s                              │
│  │  [More reasoning...]                      │
│  │                                           │
│  ● InternetIcon                              │
│  │  Searching: "useEffect cleanup"           │
│  │  [Sources: ○ react.dev ○ mdn.io ○ +1]    │
│  │                                           │
│  ─── Final response appears here ───         │
│                                              │
│  [Copy] [👍] [👎] [↺]  Model: gpt-4o  [○ react.dev ○ mdn.io ○ +2]
│                                              │
└─────────────────────────────────────────────┘
```

---

## 4. Component Architecture

### New file: `src/components/chat/ThinkingTimeline.tsx`

A component that:
- Receives `toolInvocations` (filtered to search tools) and `reasoning` as props
- Interleaves thinking and searching steps in chronological order
- Renders them as a connected vertical timeline
- Exposes the aggregated sources for use in the footer

### Modified: `AssistantBubble.tsx`
- Replace the current tool-invocation pill section (lines 159-173) with `<ThinkingTimeline>`
- Replace the current reasoning panel section (lines 181-222) — it becomes part of the timeline
- Remove the "Thinking..." fallback (line 175-179) — timeline handles it
- Add sources row in the footer (after streaming done)

### Data model

```typescript
type TimelineStep =
  | {
      type: 'thinking';
      reasoning: string;       // accumulated reasoning text so far
      isActive: boolean;       // still receiving reasoning tokens
      duration: number;        // seconds elapsed
    }
  | {
      type: 'searching';
      toolCallId: string;
      query: string;           // the search query
      state: 'running' | 'done';
      sources: string[];       // source URLs from results
      sourceCount: number;     // total results found
    };
```

---

## 5. Implementation Plan

### Step 1: Build the `ThinkingTimeline` component

The component takes an array of steps and renders them:

```tsx
<ThinkingTimeline
  steps={steps}
  isReasoningOpen={bool}
  onToggleReasoning={fn}
/>
```

Each step renders:
- **Left column**: Icon circle + connecting line (same as current reasoning panel's clock icon + line pattern)
- **Right column**: 
  - For thinking: Title ("Thinking Xs" / "Thought for Xs") + expandable reasoning sentences
  - For searching: Title (`Searching: "query"`) + sources row

### Step 2: Build the steps array in `AssistantBubble`

The `AssistantBubble` component will construct the steps array from:
- The `reasoning` string (split by search tool invocations)
- The `toolInvocations` array (filtered to search tools: webSearch, fetchPage, imageSearch, newsSearch)

The tricky part is **interleaving** — we need to know which parts of reasoning happened before/after each search. This can be done by:
- Tracking which parts of the AI message contain reasoning vs tool calls
- Using the `parts` array from the AI SDK message if available, or `toolInvocations` + `reasoning` text

**Alternative (simpler) approach**: Since the tool invocations and reasoning arrive in real-time, we can build the timeline incrementally:

1. When `reasoning` updates and there are no search tools → it's the current thinking step
2. When a search tool appears → close current thinking step, open search step
3. When search finishes → open next thinking step (if more reasoning follows)
4. When all done → close everything

This is simpler and matches the streaming nature of the data.

### Step 3: Sources in the footer

After streaming is done, collect all unique source URLs from all search tool results and display them next to the model label:

```tsx
<div className="flex items-center gap-1.5">
  {visibleSources.map(url => (
    <a href={url} target="_blank" className="...">
      {new URL(url).hostname}
    </a>
  ))}
  {remaining > 0 && (
    <span className="w-7 h-7 rounded-full bg-neutral-100 text-xs flex items-center justify-center">
      +{remaining}
    </span>
  )}
</div>
```

### Step 4: Remove the old "running" shimmer pills

Delete the `hasOtherPendingTool` section (lines 159-173 of AssistantBubble.tsx), and the "Thinking..." fallback (lines 175-179). These are replaced by the timeline.

---

## 6. Suggestions & Considerations

### What I'd add/refine:

1. **Source URLs as clickable pills** — Each source should be a small pill/chip showing just the domain name, clickable to open in a new tab. This matches the "circle shape" you mentioned.

2. **Animated transitions** — When new steps appear, they should fade/slide in smoothly (we already have `stagger-*` and `thinking-pad-fade-in` animations we can reuse).

3. **Auto-scroll** — The timeline should auto-scroll during streaming just like the current reasoning panel does (already implemented with `scrollRef`).

4. **Concurrent search display** — When multiple searches run concurrently, show them as a **group** under a single search entry with a small "1 of 3 complete" progress indicator.

5. **Search duration timer** — Similar to the thinking timer, show "Searching for Xs" while running.

6. **Error state** — If a search fails, show the entry with a red-tinted icon and the error message instead of sources.

7. **Color coding** — Use subtle color accents:
   - Thinking: neutral/gray tones (current)
   - Searching: slight blue tint (to differentiate)
   
   OR keep everything neutral for a clean look.

### What I'd keep exactly as-is:

- The expand/collapse behavior for reasoning (with CSS grid animation)
- The `ThoughtLabel` component pattern (just adapt it for the timeline)
- The current sentence-splitting logic for reasoning text
- The footer action buttons layout (copy, thumbs up/down, regenerate)

### Things to watch out for:

- **Reasoning without search** — When the model just thinks and responds (no tools), the timeline should show a single thinking step, then the final response. No timeline = no entry needed? Or always show at least one thinking entry if there's reasoning text.
- **Offline / no reasoning** — When there's no reasoning text at all, we should show nothing (simpler than current "Thinking..." text).
- **Timeline without any search** — The timeline should gracefully handle zero search steps (just show thinking section as it currently does).

---

## 7. Files to Create / Modify

### New files

| File | Purpose |
|------|---------|
| `src/components/chat/ThinkingTimeline.tsx` | The main timeline component |

### Modified files

| File | Changes |
|------|---------|
| `src/components/chat/AssistantBubble.tsx` | Replace tool pill section + reasoning section with `<ThinkingTimeline>`. Add sources footer. |
| `src/index.css` | Add any new animation classes needed (optional) |

### No changes needed

| File | Reason |
|------|--------|
| `src/lib/chatUtils.ts` | Data extraction logic stays the same |
| `src/pages/ChatPage.tsx` | Props passed to AssistantBubble stay the same |
| `src/components/chat/ThoughtLabel.tsx` | Can be simplified/replaced by timeline |
| `src/components/chat/ThinkingIndicator.tsx` | Can be deprecated if timeline replaces it |

---

## 8. Rejected / Removed

- **"Running text rill" (shimmer pills)** — Removed entirely. Replaced by the timeline search entry with animated "Fetching from..." sources row.

---

## 9. Next Steps

1. ✅ You review this doc and provide feedback / approve
2. I implement `ThinkingTimeline.tsx`
3. I integrate it into `AssistantBubble.tsx`
4. I add the sources footer
5. I remove the old shimmer pill code
