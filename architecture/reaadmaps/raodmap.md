# Feature Roadmap — Actionable Update Plans

> Organized by implementation tier. Each tier builds on the previous one.
> Features are grouped by shared infrastructure so you avoid rebuilding the same foundation twice.

---

## Tier 1 — Core Intelligence Layer
*Must be done first. Everything else depends on this.*

---

### F1 · Multi-Modal Model Support
**Features covered:** #15 (Gemini family, RAG embedding models)

**What it is:**
Swap the hardcoded single-model assumption for a model router that can send requests to different providers and model types — text generation, embedding, vision, audio.

**What needs to be built:**
- A `ModelRouter` service in Rust/Tauri that holds provider configs
- Provider adapters: Anthropic, Google Gemini, OpenAI-compatible endpoints
- An embedding pipeline for RAG (chunk → embed → store → retrieve)
- A vector store integration (local: SQLite-VSS or LanceDB; remote: Supabase pgvector)
- UI in settings to select active model per task type (chat, embedding, vision)

**Dependencies:** None — this is foundational.
**Estimated complexity:** High

---

### F2 · Local Model Support
**Features covered:** #12 (Use local models)

**What it is:**
Let the user run models entirely on their own machine with no API key required.

**What needs to be built:**
- Integrate `llama.cpp` or `Ollama` as a local inference backend via Tauri sidecar
- A model manager UI: download, delete, switch active local model
- Auto-detect available VRAM and recommend compatible model sizes
- Seamless handoff between local and cloud model in the `ModelRouter` (from F1)
- Settings toggle: "Use local model when available"

**Dependencies:** F1 (ModelRouter must exist first)
**Estimated complexity:** High

---

## Tier 2 — Tool & Execution Layer
*Gives the agent hands. Build after Tier 1 is stable.*

---

### F3 · Web Search & Deep Search
**Features covered:** #6 (Web search), #7 (Deep search)

**What it is:**
- **Web search:** Single-pass search that retrieves and summarizes results in real time
- **Deep search:** Multi-step research loop — searches, reads pages, synthesizes, searches again based on what it finds

**What needs to be built:**
- Search provider adapters: Brave Search API, SearXNG (self-hosted option), Tavily
- A `WebFetcher` service: fetch URL → extract clean text → pass to model
- Deep search as a LangGraph-style loop: plan → search → read → evaluate → repeat until satisfied
- UI: search indicator in chat, source citations rendered inline, a "deep research" mode toggle
- Result caching to avoid redundant fetches in the same session

**Dependencies:** F1 (needs model to summarize results)
**Estimated complexity:** Medium (web search), High (deep search)

---

### F4 · CLI Tool Integration
**Features covered:** #10 (Local installed CLI options), #11 (Use CLI tool calls)

**What it is:**
The agent can discover and call locally installed CLI tools (git, ffmpeg, imagemagick, npm, python, etc.) as part of answering a request.

**What needs to be built:**
- A `CLIExecutor` Tauri command: takes a command string, runs it in a sandboxed shell, returns stdout/stderr
- A tool manifest system: user defines which CLIs are allowed, with descriptions the model can read
- Safety layer: allowlist of permitted commands, no arbitrary shell execution without user approval
- UI: a "tools" panel in settings where user enables/disables specific CLI tools
- In-chat display: show the command being run and its output inline

**Dependencies:** F5 (Agent Skills, which defines how tools are registered)
**Estimated complexity:** Medium

---

### F5 · Agent Skills
**Features covered:** #1 (Agent skills integration)

**What it is:**
A skill is a named, reusable capability the agent can invoke — like a function with a description the model can understand. Skills can wrap CLI tools, APIs, local scripts, or built-in Rust functions.

**What needs to be built:**
- A `Skill` interface: `{ name, description, inputSchema, handler }`
- A `SkillRegistry` that the model router queries before each response
- Built-in skills: read file, write file, run terminal command, web search, take screenshot
- A skill execution pipeline: model requests skill → Tauri runs it → result fed back to model
- UI: skill activity log in chat showing what was invoked and why

**Dependencies:** F1 (model must support tool/function calling)
**Estimated complexity:** High — this is the agent core

---

## Tier 3 — Perception & Control Layer
*Gives the agent eyes and the ability to act on the user's machine.*

---

### F6 · Computer Use
**Features covered:** #4 (Computer use)

**What it is:**
The agent can see the user's screen and control the mouse and keyboard to complete tasks on their behalf.

**What needs to be built:**
- Screenshot capture via Tauri (OS-level API)
- Mouse/keyboard control via a Rust crate (e.g., `enigo`)
- A perception loop: screenshot → model analyzes → model emits action → execute → repeat
- A confirmation gate UI: user must approve each action batch before execution
- A session recorder: log every action taken with timestamps for review
- Safety: an always-visible "stop" button that kills the loop immediately

**Dependencies:** F5 (skills framework), F1 (vision-capable model like Gemini or Claude 3.5)
**Estimated complexity:** Very High

---

### F7 · Browser Use
**Features covered:** #5 (Browser use)

**What it is:**
The agent controls a real browser to navigate pages, fill forms, click buttons, and extract information — without needing Computer Use level screen control.

**What needs to be built:**
- Embed a headless browser via Playwright or integrate with a running Chrome instance via CDP
- Browser skill set: `navigate`, `click`, `type`, `extract`, `scroll`, `screenshot`
- A browser session manager: open, reuse, and close browser contexts
- Visual feedback in chat: show screenshots of what the browser is seeing at each step
- Same confirmation gate and stop button as Computer Use (F6)

**Dependencies:** F5 (skills framework)
**Estimated complexity:** High

---

### F8 · Remote Control
**Features covered:** #8 (Remote control)

**What it is:**
Control the app and its agents from a remote device — phone, another computer, or a third-party interface.

**What needs to be built:**
- A local HTTP API server (Axum in Rust) that the Tauri app runs, exposing chat and agent endpoints
- Auth: a local API key the user generates in settings
- Secure tunnel option: integrate with Cloudflare Tunnel or ngrok for external access
- The Messaging Bridges (F12) can connect to this same API

**Dependencies:** F5 (agents must be stable before exposing them remotely)
**Estimated complexity:** Medium

---

## Tier 4 — Extension & Plugin Layer
*Lets the community and the user extend the app without modifying core.*

---

### F9 · Third-Party Plugins & Extensions
**Features covered:** #2 (Third-party app plugins), #3 (Extensions)

**What it is:**
- **Plugins:** Connect to external services (Notion, Linear, GitHub, Figma, etc.) via pre-built integrations
- **Extensions:** User-installable packages that add new skills, UI panels, or model behaviors

**What needs to be built:**
- A plugin manifest format: `plugin.json` with name, version, permissions, skill definitions
- A plugin loader in Rust: reads manifests from a plugins/ directory, registers skills
- A sandboxing model: plugins run in a restricted context, cannot access arbitrary filesystem or network without declared permissions
- An extension marketplace UI: browse, install, enable, disable, remove
- Plugin SDK: a documented TypeScript/Rust interface developers can build against
- Plugin update checker

**Dependencies:** F5 (skills framework — plugins register as skills)
**Estimated complexity:** Very High — this is a platform, not a feature

---

### F10 · Parallel Agents
**Features covered:** #9 (Deploy parallel agents)

**What it is:**
Spin up multiple agents that work on different subtasks simultaneously and report back to a coordinating agent.

**What needs to be built:**
- An `AgentPool` manager: spawn, monitor, and kill agent worker threads
- A task decomposition step: the root agent breaks a goal into subtasks and assigns them
- Inter-agent message passing: agents can share results through a shared context store
- UI: a multi-agent dashboard showing each agent's status, current task, and output in real time
- Resource limits: cap on how many agents can run at once, configurable in settings

**Dependencies:** F5 (skills), F3 (search), F1 (multi-model — different agents can use different models)
**Estimated complexity:** Very High

---

## Tier 5 — Creative & Specialized Tools
*High-value standalone features that don't block other tiers.*

---

### F11 · Motion Graphics Design
**Features covered:** #13 (Professional motion graphics via open-source)

**What it is:**
Generate and edit professional motion graphics, animated sequences, and visual compositions from within the app — powered by open-source rendering engines.

**What needs to be built:**
- Integrate Remotion (React-based video) or Motion Canvas as the rendering engine
- A composition editor UI: timeline, layer panel, properties panel
- Prompt-to-animation pipeline: model generates a Remotion/Motion Canvas script → rendered to preview
- Export: MP4, GIF, WebM via FFmpeg (CLI tool via F4)
- Asset library: fonts, icons, stock shapes
- Template system: pre-built motion templates the user can customize

**Dependencies:** F4 (FFmpeg CLI for export)
**Estimated complexity:** Very High

---

## Tier 6 — Messaging & Social Bridges
*Connect the app to external communication platforms.*

---

### F12 · Messaging Platform Bridges
**Features covered:** #14 (WhatsApp, Slack, Telegram, Discord, etc.)

**What it is:**
Chat with your agent through any messaging app you already use, as if it were a contact or bot.

**What needs to be built:**
- Bridge service (can run as a separate lightweight process or Tauri sidecar):
  - **Telegram:** Telegram Bot API — simplest to start with
  - **Discord:** Discord.js bot
  - **Slack:** Slack Bolt SDK
  - **WhatsApp:** WhatsApp Business API or Baileys (unofficial, higher risk)
- Each bridge connects to the local HTTP API from F8 (Remote Control)
- A bridge manager UI in settings: enable/disable each platform, show connection status, generate bot tokens
- Message format normalization: each platform sends different payloads — normalize to the internal chat format
- Rate limiting and auth: only respond to messages from approved user IDs per platform

**Dependencies:** F8 (Remote Control API must exist as the bridge target)
**Estimated complexity:** Medium per platform — start with Telegram, add others incrementally

---

## Implementation Order Summary

```
Tier 1  →  F1 (Multi-modal models)  →  F2 (Local models)
    ↓
Tier 2  →  F3 (Search)  →  F5 (Agent skills)  →  F4 (CLI tools)
    ↓
Tier 3  →  F7 (Browser use)  →  F6 (Computer use)  →  F8 (Remote control)
    ↓
Tier 4  →  F9 (Plugins & Extensions)  →  F10 (Parallel agents)
    ↓
Tier 5  →  F11 (Motion graphics)   [can be done in parallel with Tier 4]
    ↓
Tier 6  →  F12 (Messaging bridges) [depends on F8, otherwise independent]
```

---

## Risk Notes

| Feature | Risk | Mitigation |
|---|---|---|
| F2 Local models | VRAM requirements vary wildly per user machine | Let user manually select model size; default to smallest |
| F6 Computer use | High abuse potential; accidental destructive actions | Require explicit approval per action; log everything; always-visible stop button |
| F7 Browser use | Playwright binary adds significant app size | Ship as an optional downloadable extension via F9 |
| F9 Plugins | Malicious plugin could exfiltrate data | Strict permission manifest; no network access without declared intent |
| F12 WhatsApp | Unofficial APIs risk account bans | Clearly document risk; recommend Telegram as the primary bridge |
| F10 Parallel agents | LLM costs multiply quickly | Hard cap on concurrent agents; show cost estimate before spawning |