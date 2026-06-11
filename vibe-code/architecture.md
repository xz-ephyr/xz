Use a modular monolith. That is the simplest architecture that is still scalable for one person.

Do not split this into microservices. Do not add separate backend servers. Keep one desktop app, one local database, one SDK package, and a small number of clear interfaces between them.

The project should have five layers.

1. Shell layer
   Tauri is only the desktop shell. Its job is windowing, menus, file dialogs, OS integration, secure commands, and permissions.

2. UI layer
   Svelte handles screens, panels, editors, chat, settings, and layout. It should not talk directly to SQLite, the terminal, or AI providers.

3. App core layer
   This is your real product logic. It decides what happens when the user opens a file, runs a prompt, launches a terminal command, or starts an agent workflow.

4. Service layer
   These are focused services with one job each:

* file service
* terminal service
* ai service
* agent service
* sql service
* git service
* indexing service

5. Adapter layer
   This is where outside systems connect:

* Vercel AI SDK
* SQLite
* xterm backend bridge
* OS keychain
* file system
* your own agent SDK providers

The rule is simple: the core should depend on interfaces, not vendors.

A clean flow looks like this:

UI → App Core → Service → Adapter → External system

Example:
User clicks “Refactor file”
UI sends intent to core
Core asks agent service
Agent service uses file service and AI service
AI service uses provider adapter
Result comes back as a patch
UI shows diff
User approves
Patch is applied through file service

That keeps every part replaceable.

For a one-person team, the best structure is a monorepo with three main packages:

```txt
apps/desktop        -> Tauri + Svelte app
packages/sdk        -> your agent SDK
packages/core       -> shared domain logic and types
```

Inside the desktop app, keep this shape:

```txt
src/
  ui/
  features/
  core/
  services/
  adapters/
  state/
  utils/
```

What each part does:

`ui/`
Screens, components, layout.

`features/`
User-facing flows like chat, editor, terminal, settings, SQL, agents.

`core/`
Domain rules, tasks, commands, workflows, types.

`services/`
Business operations like run agent, save session, open file, execute query.

`adapters/`
Concrete implementations for SQLite, AI providers, terminal bridge, keychain, file system.

`state/`
App state and session state. Keep it simple and local.

This structure scales because each feature stays isolated, but integration stays easy because all features talk through the same core contracts.

The most important design rule is this:

Never let UI code call vendor APIs directly.
Never let an agent write to the file system directly.
Never let database code contain business logic.

That prevents the project from becoming tangled.

For the SDK, keep the same idea. Use a small public interface:

* Agent
* Tool
* Workflow
* Memory
* Provider

A user of the SDK should be able to understand it fast. The SDK should feel like a set of building blocks, not a framework maze.

A practical split is:

* `packages/sdk`: public API
* `packages/core`: shared internal logic
* `apps/desktop`: product UI and Tauri shell

That lets you reuse logic without duplicating code.

For scalability, build in this order:

1. Shell launches
2. Editor opens files
3. Terminal runs commands
4. Chat works
5. SQLite persists sessions
6. Agent can call tools
7. Indexing is added
8. Search is added
9. Git is added
10. Multi-agent workflows are added

Do not start with search, embeddings, orchestration, or plugins. Start with the vertical slice and widen slowly.

The simplest durable architecture is:

* one app
* one local database
* one SDK package
* one core domain layer
* many small services
* many adapters
* no direct cross-coupling

That is achievable alone and still leaves room to grow.