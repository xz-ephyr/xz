# Agentic Tools — Capacity, Composition & Autonomous Usage

> **Date:** 2026-06-28
> **Status:** Planning
> **Icon (Hugeicons):** `AiBrainIcon`

---

## Table of Contents

1. [How Many Tools Can an Agent Have?](#how-many-tools-can-an-agent-have)
2. [What Makes Tool Usage "Agentic"?](#what-makes-tool-usage-agentic)
3. [Current xz Tool Architecture](#current-xz-tool-architecture)
4. [Agentic Patterns for xz](#agentic-patterns-for-xz)
5. [Parallel & Sequential Tool Orchestration](#parallel--sequential-tool-orchestration)
6. [Sub-Agent Delegation](#sub-agent-delegation)
7. [MCP Integration](#mcp-integration)
8. [Tool Design Guidelines](#tool-design-guidelines)
9. [Implementation Roadmap](#implementation-roadmap)

---

## How Many Tools Can an Agent Have?

### Theoretical Limits

| Factor | Limit | Explanation |
|--------|-------|-------------|
| **Model context window** | 8K–2M tokens (varies by model) | Each tool definition consumes tokens in the system prompt. A typical tool with description + parameter schema is ~100–400 tokens. |
| **Model capability** | 64–256 tools (typical SOTA) | Frontier models (GPT-5, Gemini 3.5, Claude Opus) can reliably select from ~100+ tools. Smaller models degrade past ~20. |
| **Tool output size** | Context window ÷ steps | If each tool returns 2K tokens and the agent takes 6 steps, that's 12K tokens of tool I/O alone. |
| **Step limit** | 6–50 (depends on configuration) | xz currently uses `stepCountIs(6)`. More steps = more tool calls but higher latency and cost. |

### Practical Limits for xz

| Tier | Tools | Use Case |
|------|-------|----------|
| **Built-in core** | 5–10 | Essential tools always available: search, artifact, file ops, MCP |
| **Plugin tools** | 20–50 per session | Dynamically loaded from plugins/skills based on user's active workspace |
| **MCP server tools** | 100+ | External MCP servers contribute their own tools; filtered by relevance |
| **Sub-agent tools** | Unlimited | Each sub-agent has its own tool scope isolated from the main agent |

### Current xz Tool Count

xz currently has **5 tools** (4 executable + 1 declarative):

```
writeArtifact  → declarative (no execute)
webSearch      → execute → WebSearchService → Express /websearch
fetchPage      → execute → WebSearchService → Express /websearch
imageSearch    → execute → WebSearchService → Express /websearch
newsSearch     → execute → WebSearchService → Express /websearch
```

The system prompt has ~1.5K tokens of tool instructions. With 5 tools, this is well within limits. Scaling to 50+ tools requires a smarter approach (see [Tool Design Guidelines](#tool-design-guidelines)).

---

## What Makes Tool Usage "Agentic"?

Tool usage moves through four levels of autonomy:

| Level | Name | Behavior | Example |
|-------|------|----------|---------|
| **L0** | Reactive | AI calls tools only when explicitly instructed | "Search the web for X" → AI calls webSearch |
| **L1** | Proactive | AI decides when to call tools without being told | User asks a question → AI autonomously web searches for context |
| **L2** | Chained | AI calls tools, uses results to call more tools | Search → fetch page → extract data → write file |
| **L3** | Orchestrated | AI spawns sub-agents that each call their own tools | Main agent delegates "research this topic" to a sub-agent that uses search + fetch independently |

**xz is currently at L1–L2**: the AI proactively calls web tools, and it can chain them (search → fetch). But it has no sub-agent support, no parallel execution, and no dynamic tool registration.

**Target: L3 fully orchestrated**, where:
- The main agent delegates sub-tasks to sub-agents
- Sub-agents run in parallel with isolated tool scopes
- Results are gathered, merged, and presented by the main agent

---

## Current xz Tool Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      AI SDK streamText()                     │
│  model + system prompt + tools + messages                   │
│                                                              │
│  Step 1: Model generates text + tool_call                    │
│  Step 2: SDK pauses stream, calls tool.execute()             │
│  Step 3: Tool result fed back as tool_result message         │
│  Step 4: Model continues with tool result in context         │
│  Step 5: Repeat until maxSteps or model stops                │
│  ─────────────────────────────────────────────────────────── │
│  MAX_STEPS = 6  │  maxRetries = 2  │  NO parallel execution  │
│  NO sub-agents  │  NO MCP client   │  5 tools, all flat      │
└────────────────────────────────────────────────────────────┘
```

### Limitations

1. **Sequential only** — Each step is synchronous. The model calls tool A, waits for result, calls tool B. Cannot parallelize.
2. **Flat tool namespace** — All 5 tools are in the same scope. With 50+ tools, the model struggles to select the right one.
3. **No sub-agents** — The agent cannot delegate open-ended tasks. Everything must fit in the 6-step tool loop.
4. **No MCP** — External tool servers (MCP protocol) are not supported. Tools must be defined in TypeScript.
5. **No tool composition** — Tools cannot be composed into higher-level workflows. Each tool call is independent.
6. **No persistent tool state** — Tools cannot maintain state across steps (no accumulator, no shared context).

---

## Agentic Patterns for xz

### Pattern 1: Tool Categories (Groups)

Group related tools into categories that the model can browse:

```
┌─ Research Tools ─────────────────────┐
│  webSearch    fetchPage    imageSearch │
│  newsSearch   searchDocs              │
└──────────────────────────────────────┘
┌─ Code Tools ─────────────────────────┐
│  readFile     writeFile     editFile   │
│  searchCode   runCommand             │
└──────────────────────────────────────┘
┌─ Artifact Tools ─────────────────────┐
│  writeArtifact  renderPreview        │
└──────────────────────────────────────┘
┌─ MCP Tools (dynamic) ────────────────┐
│  ...loaded from connected MCP servers │
└──────────────────────────────────────┘
```

Instead of stuffing 50 tools into one flat list, the system prompt tells the model about each **category** and provides a `browseTools` tool that lists tools in a category. The model explores tools on-demand rather than having all definitions in context.

### Pattern 2: Meta-Tool `delegateTask`

Add a single meta-tool that accepts an open-ended task description and spawns a sub-agent:

```
Tool: delegateTask
  Description: "Delegate a complex or open-ended task to a sub-agent.
                The sub-agent has access to all the same tools and will
                work autonomously until completion."
  Parameters:
    - task: string (detailed description of the task)
    - context: string (relevant conversation/project context)
    - tools: string[] (tool categories allowed for this sub-agent)
```

The sub-agent runs its own `streamText()` call with its own step limit, isolated context, and a focused tool set. Results are returned to the main agent.

### Pattern 3: Tool Chaining DSL

Define high-level workflows in a simple JSON format that the model can invoke:

```json
{
  "workflow": "research-and-summarize",
  "steps": [
    { "tool": "webSearch", "params": { "query": "$topic" } },
    { "tool": "fetchPage", "params": { "url": "$result.url" } },
    { "tool": "writeArtifact", "params": { "type": "markdown", "content": "$summary" } }
  ]
}
```

The model calls `runWorkflow` with the workflow name and parameters, and the framework executes the steps, piping outputs between them.

### Pattern 4: Parallel Tool Execution

Allow the model to request multiple independent tool calls in a single step:

```
User: "Search for pricing and features of OpenAI Codex and Google Antigravity"

AI Step 1:
  → webSearch("OpenAI Codex CLI pricing")
  → webSearch("OpenAI Codex CLI features")
  → webSearch("Google Antigravity pricing")
  → webSearch("Google Antigravity features")
  [All 4 execute in parallel, results returned together]

AI Step 2:
  → writeArtifact(type: markdown, content: "## Comparison\n...")
```

The AI SDK's `stepCountIs()` naturally handles this — if the model generates multiple tool calls in one turn, the SDK batches them. The current 4 search tools already support this pattern.

### Pattern 5: MCP as Universal Tool Bridge

Instead of defining each tool in TypeScript, connect to MCP servers that expose tools dynamically:

```
xz Agent ──MCP client──► Codex CLI MCP  (tools: reviewCode, execCommand)
                        ► Filesystem MCP (tools: readFile, writeFile, searchFiles)
                        ► GitHub MCP     (tools: createPR, reviewPR, listIssues)
                        ► Database MCP   (tools: query, migrate, backup)
```

MCP servers can be:
- Local processes (stdio)
- HTTP services (SSE)
- Docker containers

---

## Parallel & Sequential Tool Orchestration

### Current: Strict Sequential

```
Step 1: tool_call A → execute A → result A
Step 2: tool_call B → execute B → result B
Step 3: tool_call C → execute C → result C
Total: 3 rounds, ~6–15 seconds
```

### Optimized: Parallel Batches

```
Step 1: tool_call A + B + C → execute A || B || C → results A+B+C
Step 2: synthesize results
Total: 1 round, ~2–5 seconds
```

The Vercel AI SDK supports this natively — if the model emits multiple tool_calls in one response, `streamText()` executes them concurrently. xz already benefits from this for search tools.

### Orchestration: Go Agent Backend

For heavy orchestration (sub-agents, workflows, MCP routing), add a **Go agent backend** that:

```
xz Frontend (React)
    │ HTTP POST /agent/run
    ▼
Go Agent Backend (port 3002)
    │
    ├── Spawns sub-agents (goroutines)
    ├── Executes parallel tool calls
    ├── Manages tool state & caching
    ├── Routes MCP requests to servers
    └── Returns aggregated results
         │
         ▼
xz Express Backend (port 3001)
    │ (SQLite, web search, sessions)
    ▼
xz Frontend → AI SDK streamText()
```

---

## Sub-Agent Delegation

### Architecture

```
┌─ Main Agent ─────────────────────────────────────────────┐
│  streamText(model, system + tools, maxSteps=10)           │
│  Has meta-tool: delegateTask(task, context, toolScope)    │
│                                                            │
│  When delegateTask is called:                              │
│    ┌─ Sub-Agent ──────────────────────────────────────┐   │
│    │  streamText(model, focusedSystem + subsetTools)   │   │
│    │  Runs autonomously with its own step limit        │   │
│    │  Returns structured result                        │   │
│    └──────────────────────────────────────────────────┘   │
│  Main agent receives result, continues its own loop       │
└──────────────────────────────────────────────────────────┘
```

### Implementation in xz

The Go agent backend handles sub-agent lifecycle:

```go
// Go agent backend: sub-agent management
type SubAgentRequest struct {
    ID        string   `json:"id"`
    Task      string   `json:"task"`
    Context   string   `json:"context"`
    ToolScope []string `json:"toolScope"`
    Model     string   `json:"model"`
    MaxSteps  int      `json:"maxSteps"`
}

type SubAgentResult struct {
    ID       string `json:"id"`
    Result   string `json:"result"`
    Steps    int    `json:"steps"`
    Duration int64  `json:"durationMs"`
    Error    string `json:"error,omitempty"`
}
```

The Go backend:
1. Receives `delegateTask` from the main agent
2. Creates a sub-agent goroutine
3. Calls the AI SDK (via Express proxy or directly) with focused context
4. Returns results with low latency
5. Reports progress via WebSocket or polling

---

## MCP Integration

### Current State

xz has **no MCP support**. Tools are hardcoded in TypeScript using the Vercel AI SDK `tool()` factory.

### Target Architecture

```
xz Agent
    │ MCP client (TypeScript or Go)
    │
    ├── MCP Server: Filesystem
    │   readFile, writeFile, searchFiles, listDirectory
    │
    ├── MCP Server: GitHub
    │   createPR, reviewPR, listIssues, createIssue
    │
    ├── MCP Server: Database
    │   queryDatabase, runMigration, backupDatabase
    │
    └── MCP Server: Custom (user-installed)
        Any MCP-compatible server
```

### Implementation Path

1. **Add an MCP client in Go** (recommended, since Go's concurrency model fits MCP's parallel request pattern well)
2. **Or add an MCP client in TypeScript** using `@modelcontextprotocol/sdk`
3. Each MCP server's tools are dynamically registered as AI SDK tools
4. Tool definitions are fetched from the MCP server at session start
5. The Go agent framework acts as an MCP hub/router

---

## Tool Design Guidelines

### For Tool Creators

| Principle | Details |
|-----------|---------|
| **Single responsibility** | Each tool does exactly one thing. Avoid "Swiss Army knife" tools. |
| **Clear descriptions** | Describe what the tool does, when to use it, and what output to expect. "Use this when you need to..." |
| **Idempotent where possible** | Running the same tool with the same params should produce the same result (or be harmless to retry). |
| **Structured output** | Return JSON, not raw text. The model parses structured data more reliably. |
| **Error resilience** | Never throw. Return `{ error, partialResult }` so the model can recover. |
| **Explicit parameter schemas** | Use Zod schemas with descriptions on every field. The model uses these descriptions to decide parameters. |
| **Rate-limit aware** | Include `retryAfter` or `suggestBackoff` in error responses. |

### For the Tool Registry

```ts
interface ToolRegistration {
  id: string;                    // Unique tool name (snake_case)
  category: ToolCategory;         // research | code | file | mcp | system
  definition: ToolDefinition;     // Vercel AI SDK tool definition
  maxConcurrency?: number;        // Max parallel instances (default: 5)
  timeoutMs?: number;             // Per-call timeout (default: 30000)
  cacheTTL?: number;              // Cache results in ms (0 = no cache)
  requiredPermission?: string;    // Permission scope for security
  allowedInSubAgent?: boolean;    // Can sub-agents use this? (default: true)
}
```

### Scaling to 50+ Tools

| Strategy | How It Works |
|----------|-------------|
| **Category routing** | Group tools into categories. The model first picks a category, then a tool within it. |
| **On-demand loading** | Only load tool definitions relevant to the current conversation. |
| **MCP namespacing** | Each MCP server contributes a namespace (e.g. `github_*`, `fs_*`). |
| **Tool descriptions as index** | Instead of listing all tools inline, provide a `listTools` meta-tool to browse available tools. |
| **Sub-agent scoping** | Each sub-agent gets a subset of tools relevant to its task. |
| **Priority tiers** | Core tools (always available) + workspace tools (loaded per project) + MCP tools (on-demand). |

---

## Implementation Roadmap

### Phase 1: Expand Built-in Tools (Now)

- Add `readFile` and `writeFile` tools for direct file editing
- Add `searchCode` tool for codebase search (grep-like)
- Add `listDirectory` tool for exploring project structure
- Add `runCommand` tool for terminal execution (sandboxed via Tauri shell or Docker)

### Phase 2: Tool Categories & Namespacing (Next)

- Organize tools into `research.*`, `code.*`, `fs.*`, `system.*` namespaces
- Implement `browseTools(category)` meta-tool
- Add tool filtering by workspace type

### Phase 3: Sub-Agent Support (Go Backend)

- Build the Go agent backend with sub-agent lifecycle management
- Add `delegateTask` meta-tool to the main agent
- Implement isolated context + tool scope per sub-agent
- Add WebSocket progress reporting

### Phase 4: MCP Integration

- Add MCP client to the Go backend
- Support stdio MCP servers (local processes)
- Support SSE MCP servers (remote HTTP)
- Auto-discover MCP servers from config files (support `~/.codex/config.toml`, `claude_settings.json`, etc.)

### Phase 5: Workflow Engine

- Define composable workflows as JSON/YAML
- Add `runWorkflow` meta-tool
- Support conditional branching, parallel fan-out, and error recovery
- Version and cache workflow definitions

---

## Appendix: Tool Capacity Reference

| Model | Effective Tool Limit | Best At |
|-------|---------------------|---------|
| **Gemini 3.5 Flash** | ~60 tools | Fast tool routing, parallel calls |
| **Claude Opus 4.8** | ~120 tools | Complex multi-step tool chaining |
| **GPT-5.5** | ~100 tools | Balanced tool selection |
| **Llama 4 Scout** | ~40 tools | Basic tool use within category |
| **DeepSeek V4 Flash** | ~50 tools | Cost-effective tool orchestration |
| **Mistral Large** | ~50 tools | Precise tool parameter selection |

The effective limit depends more on **description quality** and **parameter schema clarity** than model size. A well-documented tool with clear Zod schemas will be used correctly by any model; a poorly-documented tool will be ignored or misused even by the largest model.
