# Write Tool + Crash Fix Plan

## Part 1: The Write Tool

### Concept
The AI calls `writeArtifact` tool with artifact data as JSON arguments. The content is **hidden** in the tool call (not visible as stream text). The UI shows a shimmer animation while the tool runs, then the artifact preview card + explanation text.

### 3-Stage UI Flow

```
Stage 1: Thinking (reasoning section — already works)
         ↓
Stage 2: Stream text — one sentence of intent
         ↓
Stage 3: AI calls writeArtifact tool
         ├─ UI shimmer: [PencilEdit02Icon] Writing "Title"
         ├─ Tool execute() returns params
         └─ After done:
            ├─ Stream text explaining what was done
            └─ ArtifactsPreviewCard (clickable card)
```

### Files to Create

**`src/services/ai/tools/writeArtifactTool.ts`**
- Tool definition with `tool()` from `ai` SDK + `z` from `zod`
- Parameters: `identifier`, `type` (enum), `title`, `language?`, `content`
- `execute: async (args) => args` (just returns params — content is in the tool call args)

**`src/components/chat/WritingToolShimmer.tsx`**
- Props: `title: string`
- Shows while writeArtifact tool is running
- Layout: `[PencilEdit02Icon]` on left, "Writing" + artifact title on right
- Uses `thinking-shimmer-text` CSS class for all text
- NO timer/counter (unlike ThoughtLabel which shows "Thinking 5s")

### Files to Modify

**`src/services/aiService.ts`**
- Import and pass `tools: { writeArtifact }` to `streamText()`

**`src/services/ai/config.ts` — System prompt update**
Replace the `<antArtifact>` XML artifact instructions with writeArtifact tool instructions:
1. Think through the artifact content
2. State intent in one sentence (e.g. "I'll create a document about Earth.")
3. Call `writeArtifact` with identifier, type, title, content
4. After tool completes, explain what was created
5. Keep `<antArtifact>` as fallback for models that don't support function calling

**`src/components/chat/AssistantBubble.tsx`**
- Import `WritingToolShimmer`
- Detect `toolName === 'writeArtifact'` in `pendingTools`
- Render `WritingToolShimmer` instead of generic tool badge when this tool is pending
- Hide shimmer when tool state === 'result'

**`src/lib/chatUtils.ts`**
- In `mapUIMessageToLegacyMessage`:
  - After extracting `toolInvocations`, check for `writeArtifact` tool calls
  - Extract `{ identifier, type, title, language, content }` from tool args
  - Build an `Artifact` object and add it to the message's `artifacts` array
- This lets existing `addArtifacts()` pipeline handle it unchanged

---

## Part 2: Fix Chat Session Crash When Creating Artifacts

### Root Causes Identified

**1. Duplicate `addArtifacts` calls**
Both `handleChatFinish` (line 97-115) AND a `useEffect` (line 218-226) call `addArtifacts`. On stream finish, both fire, processing the same artifacts twice. The second call finds the existing artifact, increments its version, and creates a phantom version entry.

**2. State setters inside state updater callback**
In `useArtifacts.ts` line 50-52:
```ts
setActiveArtifactId(newArtifacts[0].identifier);
setIsPanelOpen(true);
```
These are called **inside** the `setArtifacts(prev => ...)` functional updater. Calling setState inside another setState callback violates React's rules and can cause "cannot update during existing state transition" errors, especially with concurrent features in React 19.

**3. Race condition in streaming**
During streaming, `messages` updates on every chunk. The `useEffect` fires each time. If the last message's content has complete `<antArtifact>` tags, `addArtifacts` is called on every single stream update, not just once.

**4. `event.message` might be malformed**
`handleChatFinish` calls `mapUIMessageToLegacyMessage(event.message)` — if the SDK changes its message structure (e.g. with tool call parts), this could crash.

### Fix Plan

**Fix 1: Remove duplicate `addArtifacts` call**
In `ChatPage.tsx`, remove the `useEffect` that watches `messages` for artifacts (lines ~218-226). Keep only `handleChatFinish`. The `useEffect` is redundant—`handleChatFinish` already fires exactly once when streaming ends.

**Fix 2: Move state setters outside updater**
In `useArtifacts.ts`, restructure `addArtifacts` to call `setActiveArtifactId` and `setIsPanelOpen` **after** (or before) `setArtifacts`, not inside it.

Before:
```ts
const addArtifacts = useCallback((newArtifacts) => {
  setArtifacts((prev) => {
    // ... process artifacts
    if (newArtifacts.length > 0) {
      setActiveArtifactId(newArtifacts[0].identifier);  // ← PROBLEM: setState inside setState
      setIsPanelOpen(true);                               // ← PROBLEM
    }
    return updated;
  });
}, []);
```

After:
```ts
const addArtifacts = useCallback((newArtifacts) => {
  setArtifacts((prev) => {
    // ... process artifacts (NO state setters here)
    return updated;
  });
  if (newArtifacts.length > 0) {
    setActiveArtifactId(newArtifacts[0].identifier);
    setIsPanelOpen(true);
  }
}, []);
```

**Fix 3: Add defensive checks**
In `handleChatFinish`, add a try-catch around `mapUIMessageToLegacyMessage` and check that `event?.message` exists before processing.

**Fix 4: Deduplicate artifact processing in `addArtifacts`**
Track which artifact identifiers have already been processed this session using a Set ref to prevent double-adding the same artifact.

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/services/ai/tools/writeArtifactTool.ts` | **Create** | Tool definition |
| `src/components/chat/WritingToolShimmer.tsx` | **Create** | Shimmer UI during tool execution |
| `src/services/aiService.ts` | Modify | Register tool with streamText |
| `src/services/ai/config.ts` | Modify | Update system prompt for tool flow |
| `src/components/chat/AssistantBubble.tsx` | Modify | Render shimmer for writeArtifact tool |
| `src/lib/chatUtils.ts` | Modify | Extract artifact from tool call args |
| `src/pages/ChatPage.tsx` | Modify | Remove duplicate addArtifacts useEffect; add try-catch in handleChatFinish |
| `src/hooks/useArtifacts.ts` | Modify | Move state setters outside setArtifacts callback; add dedup logic |
