# Design Spec

## 1. Product direction

This project is a local-first AI developer desktop app built with Tauri. It is meant to stay small, fast, and simple to contribute to. The app is BYOK, stores data on the user’s machine only, and is not built around cloud syncing or remote state.

The product should feel like an AI workspace rather than a full IDE clone. The goal is to combine a compact code editor, terminal, AI routing, SQL tools, and multi-agent workflows into one desktop app without turning it into a heavy platform.

## 2. Core product principles

- Local-first by default.
- Bring your own key.
- Keep the installer and shipped app small.
- Avoid heavy dependencies unless they clearly earn their place.
- Prefer simple, readable APIs for contributors.
- Build in vertical slices, not broad unfinished infrastructure.
- Use small, composable primitives instead of one giant abstraction layer.
- Optimize for daily usefulness, not novelty.

## 3. Final app stack

### Desktop shell
- Tauri
- Rust backend for OS integration, commands, and secure local operations
- TypeScript frontend
- Vite
- Svelte

### Editor
- CodeMirror 6

### Terminal
- xterm.js

### AI layer
- Vercel AI SDK
- BYOK support
- Multi-provider routing
- Local model support later if needed

### Storage
- SQLite
- Local-only data on the user’s machine

### Secrets
- OS credential store only
- Windows Credential Manager
- macOS Keychain
- Linux Secret Service

### Agent SDK
- Custom TypeScript SDK
- Open source
- Designed to be contributor-friendly
- Built around agents, tools, workflows, memory, and providers

### Deliberately avoided
- Electron
- Monaco Editor
- LangChain-style complexity
- Python runtime in the main app
- Vector database dependency at the core
- Docker dependencies
- Antigravity SDK as a core runtime dependency

## 4. Why TypeScript is the SDK language

The public SDK should be written in TypeScript because it is easier for contributors to understand, easier to publish, easier to install, and easier to adopt in an open-source ecosystem. The runtime can stay lightweight while the SDK surface stays familiar.

The best structure is:
- TypeScript for the public SDK
- Rust only where the desktop app needs OS access, performance, or secure local execution

That keeps the developer experience simple while preserving room for a stronger core later.

## 5. Agent SDK design

The SDK should be small and predictable.

### 5.1 Core ideas

- Agents are functions, not complicated object graphs.
- Tools are first-class.
- Workflows are explicit.
- Memory is pluggable.
- Providers are adapters.

### 5.2 Suggested package split

- `@your-sdk/core`
- `@your-sdk/agent`
- `@your-sdk/tool`
- `@your-sdk/workflow`
- `@your-sdk/memory`
- `@your-sdk/provider`

### 5.3 Minimal public API shape

```ts
const agent = createAgent({
  name: "Research Agent",
  model: openai("gpt-5"),
});

agent.tool(searchTool);

const result = await agent.run("Find information about Rust");
```

### 5.4 Tool design

Tools should cover the real surfaces of the app:
- file access
- terminal actions
- SQL access
- git actions
- search
- task execution

### 5.5 Workflow design

Workflows should be explicit and readable:
- planner
- search agent
- code agent
- reviewer
- SQL agent
- terminal agent

The SDK should not hide control flow behind magic.

### 5.6 Memory design

Memory should not be hardcoded. It should support:
- SQLite
- alternate adapters
- custom storage backends if needed later

## 6. Rust strategy

Do not start with a Rust-heavy SDK.

Rust should appear only where it clearly helps:
- file watching
- process control
- local indexing
- command execution
- secure OS integration
- performance-sensitive runtime tasks

The app should not require contributors to understand a large Rust codebase just to add ordinary agent features.

## 7. Product features by version

### V1
- AI chat
- file explorer
- code editor
- terminal
- SQLite browser
- model routing
- basic sub-agents

### V2
- diff viewer
- project indexing
- semantic search
- git integration
- workflow execution

### V3
- multi-agent orchestration
- smarter terminal automation
- SQL workflows
- more project awareness

### V4
The v4 goal is to make the app feel like a serious local developer operating system.

1. Project-wide semantic search.
2. Multi-agent task planner.
3. Patch-based refactoring.
4. Terminal command explanation and replay.
5. SQL workspace.
6. Context bundles.
7. Git-aware workflows.
8. Local memory vault.
9. Model router with cost control.
10. Workspace automation.

### V5
The v5 goal is to make the app feel indispensable in daily work.

1. Workspaces with saved states.
2. One-click issue intake.
3. Safe auto-apply mode.
4. Cross-project search.
5. Context timeline.
6. Test runner integration.
7. Release prep mode.
8. Inline code actions.
9. Local knowledge graph.
10. Session export and recovery.

## 8. Current build order

The app should be built in this order:

1. Install Node.js LTS.
2. Install Rust with `rustup`.
3. Scaffold the app with `npm create tauri-app@latest`.
4. Verify the Tauri shell launches.
5. Add CodeMirror.
6. Add xterm.js.
7. Add the AI layer.
8. Add SQLite.
9. Add secrets storage through the OS credential store.
10. Wire file access, terminal execution, and agent routing one by one.

Do not bring in extra libraries before the first working vertical slice exists.

## 9. First vertical slice

The first shipping slice should support:

- opening a project folder
- showing files
- opening a file in CodeMirror
- chat with the AI
- saving conversations to SQLite
- running terminal commands
- letting the agent read selected files

Only after that should the app grow into multi-agent and indexing workflows.

## 10. UI design language

This app should reuse the visual language already established in the settings and chat UI.

### 10.1 Shared visual language
- Constrained content widths
- Soft neutral surfaces
- Low-radius geometry
- Fast micro-motion
- Clear typography hierarchy

### 10.2 Settings layout pattern
- Left navigation rail with fixed width
- Right content pane with generous padding
- Compact stacked tabs
- Active state shown with a soft neutral fill

### 10.3 Section composition
- Large blocks separated by generous spacing
- Section title
- Rows with left label and right control
- Small helper text under labels

### 10.4 Control styling
- Soft inline value pills
- Neutral input fields
- Segmented button groups
- Dropdown overlays with click-away behavior
- Secondary actions revealed on hover

### 10.5 Chat layout pattern
- Top bar
- Scrollable message region
- Bottom input zone
- Assistant text should feel lighter and less boxed
- User messages can use a soft contained block
- Input should auto-grow
- Message widths should stay constrained for readability

### 10.6 Reusable components
- `SettingsSplitLayout`
- `SettingsSection`
- `SettingsRow`
- `SoftPill`
- `SoftInput`
- `DropdownSurface`
- `ChatLane`
- `UserBubble`
- `AssistantMessageBlock`
- `ChatComposer`

## 11. Suggested project structure

```txt
app/
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   ├── db/
│   │   └── main.rs
│   └── tauri.conf.json
├── src/
│   ├── components/
│   ├── agents/
│   ├── lib/
│   └── main.ts
├── data/
└── package.json
```

## 12. Data model direction

Store all user data locally in SQLite.

Likely tables:
- projects
- sessions
- messages
- agent_runs
- settings
- tasks
- files
- sql_queries
- git_events

Keys and secrets should never be stored directly in the app database.

## 13. Architecture model

```txt
User
  -> Planner Agent
    -> Search Agent
    -> Code Agent
    -> SQL Agent
    -> Reviewer Agent
```

The planner decides which worker to invoke. Each worker has one job. No agent should own opaque state that becomes hard to reason about.

## 14. What the app should feel like

The app should feel:
- quiet
- fast
- local
- predictable
- useful
- easy to repair
- easy to extend

It should not feel like a giant platform that tries to do everything at once.

## 15. Definition of success

The project is on track if:
- a new contributor can understand the stack quickly
- the app stays small
- the UI remains consistent
- the SDK stays readable
- the desktop shell is stable
- the AI layer is replaceable
- local data stays local

## 16. Immediate next step

The next step is to implement the first vertical slice and keep the dependency list frozen until it works end to end.

That means:
- app shell
- editor
- terminal
- chat
- local storage
- a small agent tool path

Only after that should the SDK and the app expand further.
