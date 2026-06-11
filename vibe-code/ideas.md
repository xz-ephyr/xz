I am checking the current SDK ecosystem so the recommendation is anchored in what developers actually ship with today, not just a preference.

Use TypeScript for the public SDK. TypeScript is a superset of JavaScript, compiles to JavaScript, and runs wherever JavaScript runs; the AI SDK you already chose is also a TypeScript toolkit, so this keeps your stack aligned with the ecosystem you are building on. npm also supports public package publishing cleanly, which makes open-sourcing and installing the SDK straightforward.

If you can split the system into two layers, do this: Rust for the core engine, TypeScript for the SDK surface. Rust gives you the safer, higher-performance concurrency model for file watching, process control, indexing, and agent orchestration, while TypeScript gives developers the easiest onboarding and the cleanest package story.

So the practical answer is: TypeScript-first SDK, Rust-backed core. That is the least painful choice for open source, easiest for other devs to consume, and still strong enough to become an alternative agent framework.

What and how should the Rust be coz it too curve in it learning and j would like to have something that can be contributed to, so how do I design my own agent sdk

If your goal is:

Easy for contributors
Easy for users
Open-source adoption
Alternative to Antigravity

Then I would not start with Rust at all.

Most agent frameworks that gained adoption started in Python or TypeScript because contributors could understand the codebase quickly.

Your problem right now is not performance.

Your problem is:

Can someone understand the SDK in 30 minutes and build an agent?

That's what determines adoption.

My recommendation:

v1: Pure TypeScript

Build everything in TypeScript.

sdk/
├── agent.ts
├── task.ts
├── workflow.ts
├── tool.ts
├── memory.ts
├── provider.ts
└── index.ts

Example API:

const agent = createAgent({
  name: "Research Agent",
  model: openai("gpt-5")
})

agent.tool(searchTool)

const result = await agent.run(
  "Find information about Rust"
)

Keep it ridiculously simple.

Design principles
1. Agents are just functions

Bad:

class AgentManagerFactoryBuilder

Good:

const agent = createAgent(...)
2. Tools are first-class
const calculator = tool({
  name: "calculator",
  execute: async (input) => {}
})

Everything becomes a tool:

file access
web search
sql
terminal
git
3. Workflows are graphs
const workflow = createWorkflow()

workflow.add(researchAgent)
workflow.add(coderAgent)
workflow.add(reviewerAgent)

No magic.

4. Memory is pluggable
memory.sqlite()
memory.postgres()
memory.custom()

Never hardcode storage.

5. Providers are adapters
provider.openai()
provider.anthropic()
provider.gemini()
provider.ollama()

The SDK shouldn't care.

v2: Add runtime

Once adoption starts:

@your-sdk/core
@your-sdk/workflows
@your-sdk/memory
@your-sdk/runtime
@your-sdk/ui

Separate packages.

Do not make one giant package.

Where Rust should appear

Only after you discover a bottleneck.

Examples:

Fast indexing
sdk-indexer

Written in Rust.

Scans:

files
symbols
embeddings
Workflow executor
sdk-runtime

Written in Rust.

Handles:

parallel execution
queues
state machines
Local vector search

Written in Rust.

What not to do

Don't build:

LangChain clone
CrewAI clone
AutoGen clone
giant abstraction layers

Those projects became hard to reason about because they accumulated layers of abstractions.

What I would build
@zephyr/agent
@zephyr/tool
@zephyr/workflow
@zephyr/memory
@zephyr/provider

Total codebase:

10k–20k lines

not

200k+ lines

The strongest position for a new agent SDK today is not "more features."

It's:

Smallest agent SDK that can scale from one agent to hundreds of agents without changing the API.

If contributors can read the entire core package in a weekend, you'll have a much better chance of attracting contributions than if you start with a Rust-heavy architecture from day one.

Recap what am using as a tech stack now for the app. Note that i have complete the sdk and i would like to move on to the next step

Based on the decisions you've made so far, your stack is now fairly focused.

Desktop App

Tauri
Rust backend (only for Tauri commands and OS integration)
TypeScript frontend
Vite build system
Svelte UI

Editor

CodeMirror 6

Terminal

xterm.js

AI Layer

Vercel AI SDK
BYOK architecture
Multi-provider support
OpenAI
Anthropic
Google
Local models via Ollama

Your Agent SDK

Written in TypeScript
Open source
Agent abstraction
Tool abstraction
Workflow abstraction
Memory abstraction
Provider abstraction

Something like:

@your-sdk/agent
@your-sdk/tool
@your-sdk/workflow
@your-sdk/memory
@your-sdk/provider

Storage

SQLite
Local-first
No cloud database
No telemetry
User owns all data

Secrets

Windows Credential Manager
macOS Keychain
Linux Secret Service

Not SQLite.

What you deliberately avoided

Electron
Monaco
LangChain
Python runtime
Vector databases
Docker dependencies
Antigravity SDK

Good decision for a small desktop product.

The next step is not adding more libraries.

The next step is building the vertical slice.

Milestone 1:

✓ Open project folder
✓ Show files
✓ Open file in CodeMirror
✓ AI chat works
✓ Save conversations to SQLite
✓ Run terminal commands
✓ Agent can read selected files

After Milestone 1:

✓ Agent tool system
✓ File tools
✓ Terminal tools
✓ SQL tools
✓ Workflow execution

After that:

✓ Multi-agent orchestration
✓ Git integration
✓ Project indexing
✓ Semantic search

My recommendation is to spend the next 2–3 weeks building the first vertical slice and resist adding any new dependencies unless a concrete problem forces you to. Most developer tools get bloated because they optimize architecture before they have a working workflow. Your current stack is already sufficient to ship an MVP.