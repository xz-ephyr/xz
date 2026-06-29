# Agent Framework & Tooling Inspection
**Date:** March 2025
**Scope:** `agent/` (Go) and `src/services/tools/` (TypeScript)

This report evaluates the architecture, orchestration, and redundancy of the agentic capabilities within the `xz` ecosystem.

---

## 1. The Go Agent Framework (`agent/`)
The Go component is a high-performance "sidecar" designed for orchestration and parallel tool execution.

### Architectural Pillars
*   **Orchestrator (`internal/agent/orchestrator.go`):** The brain of the framework. It handles three task types:
    1.  `direct`: Parallel execution of tool calls via a worker pool.
    2.  `delegate`: Spawns a `SubAgent` with a recursive planning loop.
    3.  `workflow`: Executes predefined multi-step sequences (e.g., `research_and_summarize`).
*   **Worker Pool (`internal/worker/pool.go`):** A fixed-size pool of 4 goroutines that processes tool execution requests, ensuring that heavy operations (like searching the web or indexing code) do not block the main orchestrator.
*   **Sub-Agent Manager (`internal/agent/subagent.go`):** Implements an autonomous agent loop. It can take a high-level prompt, generate a plan, execute tools, and reflect on the results until the task is complete or the step limit is reached.
*   **MCP Client (`pkg/mcp/client.go`):** A significant professional feature. It implements the Model Context Protocol, allowing the agent to connect to external tool providers (like a local database, a GitHub browser, or custom enterprise tools) via standard JSON-RPC.

---

## 2. The TypeScript Tool Registry (`src/services/tools/`)
The frontend maintains its own tool registry for direct integration with the Vercel AI SDK's `streamText` function.

### Key Components
*   **Registry (`registry.ts`):** A simple map-based store for `ToolDef` objects.
*   **Category-Based Organization:** Tools are neatly divided into `code/`, `git/`, `network/`, `system/`, and `web/`.
*   **Zod Schema Validation:** Every tool uses `zod` for input schema definition, providing excellent type safety and ensuring the LLM respects tool parameters.

---

## 3. The Redundancy Problem (The "Double Implementation")
A critical finding of this audit is the massive logic duplication between the Go and TypeScript layers.

### Redundant Tools (25+ Identified):
| Tool | Go Implementation | TS Implementation |
| :--- | :--- | :--- |
| **Web Search** | `agent/internal/tool/web_search.go` | `src/services/tools/web/webSearch.ts` |
| **Read File** | `agent/internal/tool/read_file.go` | `src/services/tools/code/readFile.ts` |
| **Git Log** | `agent/internal/tool/git_log.go` | `src/services/tools/git/gitLog.ts` |
| **System Info** | `agent/internal/tool/system_info.go` | `src/services/tools/system/systemInfo.ts` |
| **Code Search** | `agent/internal/tool/code_search.go` | `src/services/tools/code/codeSearch.ts` |

### Consequences:
1.  **Maintenance Overhead:** Every bug fix in a tool (e.g., a regex change in `grepFiles`) must be applied twice.
2.  **Behavior Inconsistency:** The Go `web_search` might use a different parsing logic than the TS `webSearch`, leading to different AI results based on which execution path is used.
3.  **Code Bloat:** Roughly 2,500 lines of redundant code across both languages.

---

## 4. Integration Analysis: The Missing Link
Currently, the React frontend and its `aiService.ts` primarily use the TypeScript Tool Registry. The Go agent framework, despite its advanced sub-agent and MCP capabilities, is under-utilized.

*   **Workflow Execution:** The Go framework's "Workflows" (like `codebase_audit`) are not exposed in the main chat UI.
*   **Orchestration Gap:** The frontend handles its own tool-calling loops (via `maxSteps` in `aiService.ts`), ignoring the Go orchestrator's worker pool and concurrency management.

---

## 5. Professional Recommendations

### Phase 1: Proxy Pattern (Immediate)
Refactor the TypeScript Tool Registry to act as a **proxy client**. Instead of implementing `webSearch` logic in TS, the TS tool should simply send an HTTP POST to `localhost:3002/api/tools/web_search`.
*   **Benefit:** Centralizes all logic in Go (better for performance/concurrency) while keeping the React UI responsive.

### Phase 2: Unified Orchestration
Allow the frontend to submit high-level tasks to the Go Orchestrator via the `/api/tasks` endpoint. The Go agent would then stream tool calls and thoughts back to the UI via Server-Sent Events (SSE) or WebSockets.

### Phase 3: MCP First
Fully embrace the MCP client. Instead of hardcoding 25 tools, the Go agent should start up, discover its own tools (including MCP-connected ones), and provide a dynamic manifest to the frontend.

---

## 6. Final Summary
The Go agent framework is architecturally superior and "enterprise-ready" due to its MCP support and concurrent worker pool. The TypeScript registry is a legacy of early development. Unifying these layers is the single most important architectural task to ensure the long-term scalability of `xz`.
