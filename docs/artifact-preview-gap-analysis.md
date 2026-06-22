# Artifact / Preview System — Gap Analysis

> **Date:** 2026-06-22
> **Reference:** `docs/artifacts-architecture-blueprint.md`
> **Status:** Audit — no code written

---

## 1. Blueprint Summary (5 Subsystems)

| # | Subsystem | What the Blueprint Describes |
|---|-----------|------------------------------|
| 1 | **SSE Streaming Transport** | Anthropic Messages API streams via SSE with typed content blocks (`text`, `thinking`, `tool_use`). The client demuxes blocks by `type` to route to different UI surfaces. |
| 2 | **Extended Thinking / CoT** | A `thinking` content block emitted before `text`, streamed as deltas. Displayed in a collapsible collapsed-by-default region. Must be replayed on multi-turn for continuity. |
| 3 | **Artifact Detection + Routing** | A convention: the model wraps artifact-worthy output in a structured tool-call (or fenced marker). The client detects this in the stream, pulls it out of the chat transcript, and routes it to a side-panel renderer instead. |
| 4 | **Sandboxing** | HTML/React/SVG rendered in a sandboxed iframe (`sandbox="allow-scripts"`, no `allow-same-origin`, strict CSP). A `postMessage` bridge exposes sanctioned host capabilities (e.g. `sendPrompt`). |
| 5 | **Storage** | Two tables: `artifact_versions` (id, conversation_id, artifact_id, version, content, content_type, created_at) and `artifact_kv` (artifact_id, owner_id, key, value, shared, updated_at). Versions are records, not diffs. |

---

## 2. Codebase File Inventory

### AI / Transport Layer

| File | What It Does |
|------|-------------|
| `src/services/aiService.ts` | Core `chatCompletion()` function. Uses Vercel AI SDK `streamText()` under the hood. Returns a `StreamTextResult` converted to SSE `Response` via `.toUIMessageStreamResponse()`. |
| `src/services/ai/config.ts` | `SYSTEM_PROMPT` definition and tool definitions (`create_artifact`, `read_file`, `write_file`, `edit_file`, `write_to_plan`, `list_dir`, `grep_tool`). |
| `src/services/ai/contextController.ts` | `getSmartSystemPrompt()` — appends project context to system prompt. |
| `src/services/ai/contextContractor.ts` | Context summarization for fallback model switches. |

### Chat UI Components

| File | What It Does |
|------|-------------|
| `src/pages/ChatPage.tsx` | Main chat page. Wires `useChat()` → `DefaultChatTransport` → `chatCompletion()`. Handles session loading, project context, message persistence. |
| `src/components/chat/AssistantBubble.tsx` | Renders assistant messages: streaming text, reasoning/thought section, tool call pills, artifact preview cards, action buttons. |
| `src/components/chat/ThoughtLabel.tsx` | Button label for the collapsible thinking section ("Thought", "Thinking…", "Thought for Xs"). |
| `src/components/chat/ToolCallPill.tsx` | Inline pill showing tool call status (reading, writing, editing, etc.). |
| `src/components/chat/ThinkingIndicator.tsx` | Older/alternative thinking indicator component (appears unused or duplicated with ThoughtLabel). |
| `src/components/chat/CodeBlock.tsx` | CodeMirror 6 read-only display for code blocks in chat markdown. |
| `src/components/chat/MarkdownMessage.tsx` | Renders markdown content with react-markdown. Custom components for code blocks, tables, etc. |
| `src/components/chat/ChatInput.tsx` | Input area with send/stop buttons, thinking toggle, artifact button. |
| `src/components/chat/UserBubble.tsx` | Simple user message bubble. |
| `src/components/chat/CopyButton.tsx` | Copy-to-clipboard button. |
| `src/components/chat/Table.tsx` | Styled table components for markdown rendering. |
| `src/components/chat/IDEPromptModal.tsx` | Modal asking user to open the IDE when entering a project. |

### Artifact / Preview Components

| File | What It Does |
|------|-------------|
| `src/components/artifacts/ArtifactRenderer.tsx` | Renders an artifact by type. React → Sandpack, HTML → raw iframe, Markdown → prose, others → stubs. **No sandbox attributes on the iframe.** |
| `src/components/artifacts/ArtifactPane.tsx` | Side panel with version dropdown, preview/code toggle, download button. |
| `src/components/artifacts/ArtifactPreviewCard.tsx` | Clickable card in the chat transcript representing a created artifact. |
| `src/components/artifacts/ProjectIDE.tsx` | Full file-tree + CodeMirror 6 editor for project file editing. Separate from the artifact preview system. |
| `src/components/artifacts/FileNode.tsx` | Recursive file tree node for ProjectIDE sidebar. |

### Hooks

| File | What It Does |
|------|-------------|
| `src/hooks/useArtifacts.ts` | In-memory artifact state management. Stores versions as `Record<string, Artifact[]>` with auto-incrementing version numbers. **Not persisted.** |
| `src/hooks/useThinkingTimer.ts` | Timer for "Thinking for Xs" label. |

### Utility / Lib

| File | What It Does |
|------|-------------|
| `src/lib/chatUtils.ts` | `mapUIMessageToLegacyMessage()` — extracts content, reasoning, toolInvocations from typed parts array. |
| `src/lib/languageUtils.ts` | Maps filenames to CodeMirror language extensions. |

### Services

| File | What It Does |
|------|-------------|
| `src/services/DatabaseService.ts` | HTTP client calling the Express backend. Methods for projects, sessions, messages, app_config. |
| `src/services/ChatSessionManager.ts` | Thin wrapper over DatabaseService for session/project CRUD. |
| `src/services/FileSystemService.ts` | Tauri-native or in-memory-web file system access. Tree reading, file content, save, compressed tree for AI context. |

### Server / Database

| File | What It Does |
|------|-------------|
| `server/src/index.ts` | Express server. Endpoints: CRUD for projects, sessions, messages, app_config. All POST. |
| `server/src/db.ts` | SQLite via better-sqlite3. Tables: `projects`, `chat_sessions`, `messages`, `app_config`. |
| `server/migrations/001_init.sql` | Standalone SQL migration with stricter types. |

### Types

| File | What It Does |
|------|-------------|
| `src/types/chat.ts` | `Project` and `ChatSession` interfaces. |

---

## 3. Gap Analysis Table

| # | Subsystem | Blueprint Expects | What We Have | Status | Notes |
|---|-----------|-------------------|-------------|--------|-------|
| 1a | **SSE Transport** | Typed content blocks (`text`, `thinking`, `tool_use`) streamed as SSE events | Vercel AI SDK provides typed parts internally (`text`, `reasoning`, `tool-{name}`, `dynamic-tool`, etc.) and uses SSE between its in-process transport and the `useChat` hook | ✅ **Done** | The SDK handles this. We don't talk to Anthropic directly — we use provider SDKs (Google, Groq, etc.) |
| 1b | **SSE Transport** | Custom event types for artifact data (`event: artifact_delta`) | No custom SSE events. All artifact data flows through the standard `tool-{name}` part type | ❌ **Missing** | We rely solely on the `create_artifact` tool call to signal artifacts. No server-side classification of artifact content |
| 2a | **Extended Thinking** | Thinking block streamed as deltas before text | The Vercel AI SDK supports `reasoning-start/delta/end` chunks. `mapUIMessageToLegacyMessage()` extracts reasoning from `parts` | ✅ **Done** | |
| 2b | **Extended Thinking** | Collapsible, collapsed-by-default UI for thinking | `ThoughtLabel` + collapsible section in `AssistantBubble.tsx`. Opens during streaming, collapses on finish | ✅ **Done** | |
| 2c | **Extended Thinking** | Multi-turn thinking continuity (signature-verified replay) | Reasoning is stored in `messages.reasoning` column but there's no special replay logic | 🟡 **Partial** | Thinking text is saved and reloaded, but no signature verification or special multi-turn handling |
| 3a | **Artifact Detection** | System prompt instructs model to wrap artifact output in a recognizable structure | Tool descriptions exist in `config.ts` but the system prompt doesn't explicitly instruct the model to use `create_artifact` for standalone code output | 🟡 **Partial** | The `create_artifact` tool exists but there's no prompt guidance on *when* to use it vs inline code blocks |
| 3b | **Artifact Routing** | Frontend detects artifact blocks in the stream and routes them to a side panel instead of chat transcript | Frontend detects `create_artifact` tool calls *after they complete* (`onFinish`). Artifacts are shown as preview cards in chat + opened in a side panel | 🟡 **Partial** | Artifacts are detected post-hoc (on tool result), not live as the stream arrives. No incremental filling of the artifact panel during streaming |
| 3c | **Artifact Routing** | Block deltas feed into side panel live, in sync with chat | No incremental rendering. Artifact content is fully available when the tool result arrives | ❌ **Missing** | Artifact content doesn't "type out" in the preview pane — it appears all at once |
| 4a | **Sandboxing** | `sandbox="allow-scripts"` on iframes, no `allow-same-origin` | `ArtifactRenderer.tsx` renders HTML as `<iframe srcDoc={content} ... />` with **no sandbox attributes** | ❌ **Missing (Security)** | Raw iframe with no sandbox means scripts in the artifact have full access to the parent page |
| 4b | **Sandboxing** | CSP meta tag injected into iframe document | No CSP injection | ❌ **Missing** | |
| 4c | **Sandboxing** | `postMessage` bridge for sanctioned host capabilities | No `postMessage` bridge exists | ❌ **Missing** | No way for rendered artifacts to communicate back to the host |
| 4d | **Sandboxing** | SVG validated/sanitized before injection | SVG rendered directly in the ArtifactRenderer's default case | ❌ **Missing** | No sanitization step for SVG |
| 4e | **Sandboxing** | React/JSX transpiled client-side in sandboxed iframe | Uses Sandpack (properly sandboxed) for React artifacts | ✅ **Done** | Sandpack handles its own sandboxing |
| 5a | **Storage** | `artifact_versions` table (id, conversation_id, artifact_id, version, content, content_type, created_at) | No artifact versioning table in SQLite. Artifacts are purely in-memory via `useArtifacts` hook | ❌ **Missing** | Artifacts lost on page refresh or navigation |
| 5b | **Storage** | `artifact_kv` table (artifact_id, owner_id, key, value, shared, updated_at) | `app_config` table provides basic global KV, but not scoped per-artifact | ❌ **Missing** | No per-artifact persistent storage |
| 5c | **Storage** | Versioning by record (not in-place diff) | `useArtifacts` hook stores versions as an array — records, not diffs. This matches the pattern but isn't persisted | 🟡 **Partial** | Correct versioning model, but only in memory |
| 5d | **Storage** | 20MB per-artifact persistent-storage limit | No artifact storage at all (in-memory only) | ❌ **Missing** | |

---

## 4. Architecture Conflicts & Adaptations

### Supabase → SQLite
The blueprint suggests Supabase (`artifact_versions` and `artifact_kv` tables in PostgreSQL). **We don't use Supabase** — we have a local Express + SQLite backend. The adaptation is straightforward: just add the tables to our existing `server/src/db.ts` and add CRUD endpoints in `server/src/index.ts`. Simpler, no external service dependency.

### Next.js → Vite + React
The blueprint assumes Next.js. We use Vite + React. The frontend principles are identical — this is just a bundler difference. No meaningful conflict.

### Direct Anthropic API → Vercel AI SDK
The blueprint describes building a custom Anthropic API proxy and re-emitting SSE events. We use the Vercel AI SDK which abstracts provider differences. Instead of server-side event re-labeling, we should:
- Add a system prompt instruction telling the model when to use `create_artifact`
- Handle artifact detection client-side by monitoring tool call parts as they stream in (the SDK exposes `tool-input-delta` events)
- Use the existing `create_artifact` tool pattern rather than inventing a new one

### Tauri WebView Sandboxing
The blueprint discusses browser iframe sandboxing. Tauri's webview supports the same standard iframe sandbox attributes, so the sandboxing approach (`sandbox="allow-scripts"` without `allow-same-origin`, CSP injection) works identically. No adaptation needed.

### No Authentication System
The blueprint mentions `owner_user_id` for artifact KV scoping. Our app has no user authentication (local-first, single-user). `owner_id` can be omitted or set to a constant. The `shared` flag is only relevant if we ever add sharing.

---

## 5. Recommended Next Step

### Start with: Live streaming artifact preview + basic sandboxing

The highest-value, smallest-scope step addresses two gaps simultaneously and adds visible UX improvement:

**What to do:**
1. **Add a system prompt instruction** in `config.ts` telling the model: *"When generating self-contained code, HTML, React components, or SVG longer than a few lines, use the `create_artifact` tool instead of inline code blocks. Use the `type` field to specify the content type."*
2. **In `ChatPage.tsx`, watch for artifact tool calls during streaming** (not just on `onFinish`). When a `tool-input-delta` arrives for a `create_artifact` call, open the artifact pane and start feeding content into it incrementally so the user sees the artifact "type out" live, in sync with the chat.
3. **Add `sandbox` attribute and CSP** to the HTML preview iframe in `ArtifactRenderer.tsx` (`sandbox="allow-scripts"`, inject `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">`).
4. **Add SVG sanitization** before injection (use a DOMPurify-style approach or strip script elements).

**Why this step:**
- Changes are localized to 3-4 files (no new DB tables, no new server endpoints)
- The artifact infrastructure already exists (`useArtifacts`, `ArtifactPane`, `ArtifactRenderer`) — we just wire it to stream live and add security
- Immediate visible improvement: artifacts stream into the preview pane in real-time
- Critical security fix: the unsandboxed iframe is a real vulnerability

**Estimated scope:** ~150-200 lines of changes across `config.ts`, `ChatPage.tsx`, `ArtifactRenderer.tsx`, and possibly a new hook or utility.

**Files to modify:**
- `src/services/ai/config.ts` — add artifact usage instruction to SYSTEM_PROMPT
- `src/pages/ChatPage.tsx` — wire artifact tool call deltas to live preview
- `src/components/artifacts/ArtifactRenderer.tsx` — sandbox + CSP + SVG sanitization
- `src/hooks/useArtifacts.ts` — may need minor changes for incremental content updates

---

*Wait for review before implementing.*
