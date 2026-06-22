# How "Claude Artifacts" Work, End-to-End — Build Blueprint

**Scope note (read this first):** Anthropic doesn't publish its internal backend (which DB, exact infra, internal encryption schemes). Nothing below claims insider knowledge of that. What follows is split cleanly into:
- **[CONFIRMED]** — publicly documented behavior (Anthropic docs) or public API spec (the Messages API streaming protocol is fully documented — this part is not a guess).
- **[INFERRED]** — the standard engineering pattern that produces the externally observable behavior. This is what you'd actually build.

Two systems get conflated in "thinking, COT, streaming, artifacts" — they're separate subsystems that happen to share one transport layer. Splitting them first:

| System | What it is | Where it shows up |
|---|---|---|
| **Streaming** | Transport layer — how tokens get from model to client | Underlies everything below |
| **Extended Thinking / CoT** | A reasoning pass the model does before its final answer | Collapsible "thought process" block in chat |
| **Artifacts** | A *rendering convention* — certain output gets pulled out of the chat stream and shown in a side panel/sandbox instead | Code/HTML/React/SVG preview pane |

---

## 1. The streaming transport [CONFIRMED — public API spec]

Anthropic's Messages API streams via **Server-Sent Events (SSE)**. The event sequence for any response:

```
event: message_start        → {message: {id, model, role, usage: {...}}}
event: content_block_start  → {index: 0, content_block: {type: "text" | "thinking" | "tool_use"}}
event: content_block_delta  → {index: 0, delta: {type: "text_delta", text: "..."}}
event: content_block_delta  → repeats — this is the actual token-by-token stream
event: content_block_stop   → {index: 0}
event: content_block_start  → {index: 1, content_block: {type: "thinking"}}   ← next block
...
event: message_delta        → {delta: {stop_reason: "end_turn"}, usage: {...}}
event: message_stop
```

Key mechanics:
- A single response is a **list of content blocks**, not one text stream. Each block has a `type`: `text`, `thinking`, `tool_use`, `redacted_thinking`.
- Blocks stream independently and sequentially. The client appends `delta.text` (or `delta.partial_json` for tool_use blocks) into a buffer keyed by `index` as events arrive.
- The frontend's job is to **route each block type to a different UI surface** as it streams — this is the entire trick behind both "thinking" and "artifacts." There's no separate magic channel; it's all the same SSE stream, demuxed by block type/index on the client.

This part you can build exactly as specified — it's the real protocol your own backend should speak to the Anthropic API, and it's the same shape you should re-emit to your own frontend.

---

## 2. Extended Thinking / CoT [CONFIRMED structure, INFERRED UI handling]

- Enabled via a `thinking: {type: "enabled", budget_tokens: N}` param on the API call.
- The model emits a `thinking` content block *before* its `text` block, streamed the same delta way.
- Some thinking content can come back as `redacted_thinking` (encrypted blob, not human-readable) — this happens when the underlying reasoning trace contains something the safety layer wants to keep server-side rather than show the user. Your client should just render it as "Claude is thinking…" with no decode attempt — don't try to reverse this.
- UI convention: render `thinking` blocks in a visually distinct, collapsed-by-default region (lighter weight, italic, "Show thinking" toggle), positioned **before** the final answer it preceded. It is explicitly *not* part of the authoritative answer — never let downstream logic in your editor treat thinking-block content as ground truth or quote it as if it were the final response.
- Thinking blocks must be passed back into the conversation history on the next turn (signature-verified) if you want multi-turn thinking continuity — check current API docs for the exact replay requirement, this has changed across model versions.

**For your editor:** if you're calling Claude (Haiku per your stack) for ghost-text/CMD+K, you almost certainly don't want extended thinking on — it adds latency you don't want for inline completion. Reserve it for the chat-with-file-context feature where users tolerate a beat of delay for a better answer.

---

## 3. How an "Artifact" gets pulled out of the chat stream [INFERRED — this is the part to actually replicate]

There is no separate "artifact API." The mechanism is a **convention layered on top of normal text/tool-use streaming**, enforced by:

1. **System-prompt-level instruction** telling the model: when output meets criteria (self-contained, >~15 lines, reusable), wrap it in a recognizable structure instead of inline chat text — in Claude.ai's case this is effectively a specialized tool-call (note the `visualize:show_widget` and similar tool patterns in this very environment — that's the public shape of it: title, language/type, and a content payload, called as a structured function rather than embedded in prose).
2. **Client-side stream parsing**: the frontend watches the incoming block stream. When it detects the artifact-tool-call block opening, it:
   - Stops rendering that block's deltas into the main chat transcript.
   - Opens a side panel and starts feeding the same incremental deltas into a code editor / sandboxed renderer instead, live, as they arrive (this is why artifact code "types out" in the side panel in sync with the chat).
   - Once `content_block_stop` fires for that block, the panel is "complete" — that's the trigger to attempt a render of HTML/React/SVG, or finalize the code/document.
3. **Rendering by type:**
   - `code` → syntax-highlighted editor view only (no execution).
   - `svg` → directly injected as `<svg>` (validated/sanitized first).
   - `html` → loaded into a **sandboxed iframe** via `srcdoc`, `sandbox="allow-scripts"` (deliberately *no* `allow-same-origin` combined with `allow-scripts` in a way that would let it reach the parent), with a strict CSP meta tag injected into the document. No access to parent DOM, cookies, or localStorage by design.
   - `react`/`jsx` → transpiled client-side (Babel standalone or esbuild-wasm) inside that same sandboxed iframe, then mounted.
   - A `postMessage` bridge connects iframe ↔ host page for the few sanctioned capabilities (e.g. a `sendPrompt(text)` global that posts a message the host turns into a new chat message — exactly the pattern described for this environment's own widget tool).
4. **Versioning & storage**: each artifact revision is a record — not a diff applied in place. Tying it to `(conversation_id, artifact_id, version_n)` lets you support "switch between versions" and "edit a previous message → forks a new version line" without mutating history. Content itself is just stored as text/blob (size is the only real constraint — Anthropic's docs cite a 20MB per-artifact persistent-storage limit for the *data* artifacts can read/write at runtime, separate from the artifact's own source size).
5. **Persistent key-value storage for artifacts** (the `window.storage` pattern): this is a small REST-ish API the host injects into the sandboxed iframe's `window` object before scripts run. `get/set/delete/list`, each scoped `shared: boolean` (private-to-user vs visible-to-all-viewers-of-that-published-artifact). Implementation-wise this is just a table: `(artifact_id, owner_user_id, key, value, shared, updated_at)` with the shared flag controlling the WHERE clause on reads from other users.

---

## 4. Concrete blueprint for *your* stack (Tauri v2 + Next.js + Supabase + Claude Haiku)

Given what you're already building for the editor (CMD+K, ghost-text, chat-with-file-context, `@file` mentions), an artifact-style preview pane is a natural extension. Minimal viable version:

**Backend (Hono.js or your existing API layer):**
- Proxy calls to Anthropic's Messages API with `stream: true`.
- Re-emit the SSE stream to the client largely as-is, but tag blocks: when you detect (via your own system prompt convention, e.g. asking the model to open artifact content with a fenced marker like ` ```artifact:tsx title="..."` or a structured tool-call if you define one) that a block is artifact content, relabel it in your own event stream (e.g. `event: artifact_delta`) so the frontend doesn't need to sniff content — you've already classified it server-side.

**Frontend (Next.js + your Tauri shell):**
- Two SSE consumers on the same stream: one appends `text_delta`/`chat_delta` to the transcript, one appends `artifact_delta` to a buffer feeding CodeMirror 6 live (you're already using CodeMirror 6 for the editor — same instance type works for the preview pane, just a second model/view).
- For live HTML/React preview: a sandboxed `<iframe>` (Tauri's webview supports standard iframe sandboxing), `postMessage` bridge for the handful of host capabilities you choose to expose.
- For storage: a `artifact_versions` table in Supabase (`id, conversation_id, artifact_id, version, content, content_type, created_at`) plus an `artifact_kv` table if you want the persistent-storage-for-AI-apps feature (`artifact_id, owner_id, key, value, shared, updated_at`).

**Where to point your agent for ground truth on the wire format itself:**
- `https://docs.claude.com` → Messages API streaming reference (exact event names/shapes, thinking block params, tool_use streaming via `partial_json` deltas).
- Your own previously-built artifacts (recipe widgets, the persistent-storage examples you've made) are good raw material for the agent to study — open each one's source and look specifically at: how it requests storage, how it structures `window.storage` calls, and how it's a single self-contained file with no external state — that constraint (no backend, one page, no multi-route) is itself a deliberate design choice worth keeping in your own version, since it's what makes artifacts portable and shareable.

**What not to bother reverse-engineering:** the exact internal mechanism Anthropic uses to decide *when* to trigger an artifact (the classifier/heuristics behind "is this artifact-worthy") isn't published and trying to byte-match it is a waste of your agent's time. Define your own trigger rule instead (e.g. "model output tagged with a specific fenced block type" or "user explicitly invokes a `/preview` command") — deterministic and good enough.

---

## 5. One practical note on inspecting it directly

You can legitimately observe the real SSE wire format yourself: open claude.ai, DevTools → Network → filter XHR/Fetch, send a message that produces an artifact, and watch the `/completion` or `/messages` request's response stream. That's normal client-side inspection of traffic your own browser receives and is a fine way for your agent to confirm event shapes against what's in this doc. Just don't have the agent build anything that scrapes or automates extraction at scale against claude.ai — that crosses into ToS territory; the documented public API is the right target for anything you intend to ship.
