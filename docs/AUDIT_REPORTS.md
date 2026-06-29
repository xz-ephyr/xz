# xz Codebase Audit & Health Reports

This document contains a detailed inspection and scoring of the `xz` project architecture, agent framework, and overall code health.

---

## 1. Project Folder System: Scoring Report
**Score: 8/10**

The project folder implementation is a sophisticated hybrid system designed for a "local-first" experience across both native (Tauri) and web environments.

### Analysis
*   **Architecture (9/10):** Excellent abstraction between Tauri's native `fs` and the Web's virtual FS. The use of `DatabaseService` to sync files to SQLite provides great persistence.
*   **Robustness (8/10):** Handles binary file skipping and large file truncation (30k/60k char limits) well, preventing LLM context overflows.
*   **Performance (7/10):** Implements a simple `treeCache` with a 2-second TTL. This is effective but might cause UI stuttering on extremely large directories during the initial scan.
*   **Maintainability (6/10):** `FileSystemService.ts` is becoming a monolith (400+ lines). The recursive `getTree` logic is complex and identified by `fallow` as a refactoring target.

### Identified Issues
*   **Sync Complexity:** The logic for moving files between `localStorage` (VFS) and the server DB during `importDirectory` is prone to race conditions if not handled carefully.
*   **Context Limits:** The 60k character hard limit for the entire project context is quite conservative for modern models (like Claude 3.5 or Gemini 1.5 Pro) which could handle significantly more.

---

## 2. npx fallow Detailed Health Report
**Overall Score: 63 (Grade: C)**

The audit reveals a project in its "scaling phase"—functional but accumulating technical debt in the UI layer.

### Metrics Summary
*   **Health Score:** 63 C
*   **Maintainability:** 92.4 (Good avg)
*   **LOC:** 11,434
*   **Duplication Rate:** 6.0% (Ideal is < 3%)

### Breakdown
*   **Dead Code:** 15 issues detected (1 Unused export, 10 Unused dependencies).
*   **Duplication:** 21 Clone families. Significant duplication in `SettingsModal.tsx` and `searchService.ts`.
*   **Large Functions (Primary Targets):**
    1.  `src/pages/ChatPage.tsx` (639 lines): A "God Component" handling routing, streaming, artifacts, and layout.
    2.  `src/components/settings/SettingsModal.tsx` (552 lines): Massive render method with inline conditional logic.
    3.  `src/services/tools/system/systemInfo.ts`: High "Untested Risk." Complex logic with zero test coverage.

---

## 3. Agent Framework & TypeScript Tools Inspection

### Architecture Synthesis
The project currently maintains two parallel tool execution paths: a **Go-based Agent Sidecar** and a **TypeScript Tool Registry**.

*   **The Go Framework (`agent/`):**
    *   **Orchestration:** High-performance orchestrator with sub-agent spawning (`internal/agent/subagent.go`).
    *   **MCP Support:** Native Model Context Protocol (MCP) support for dynamic tool discovery.
    *   **Limitation:** Currently decoupled from the main React `useChat` flow. It acts as a sidecar rather than a core executor for frontend streams.
*   **The TypeScript Tools (`src/services/tools/`):**
    *   **Integration:** Directly integrated with the Vercel AI SDK and the frontend streaming UI.
    *   **Redundancy:** Roughly 25 tools (e.g., `web_search`, `code_search`, `read_file`) are implemented in both Go and TypeScript, creating significant logic duplication and synchronization overhead.

### Recommendation
Move toward a "Sidecar-First" approach where the TS registry acts as a thin proxy to the Go agent. This would allow the React frontend to leverage the Go agent's superior orchestration and MCP tools without duplicating logic.

---

## 4. Peer Review: Performance & Professionalism

### Professionalism Gaps
1.  **Component Bloat:** `ChatPage.tsx` and `Sidebar.tsx` violate the Single Responsibility Principle. They should be broken down into atomic components (e.g., `MessageList`, `ChatHeader`, `ProjectList`).
2.  **Type Safety:** Several `any` usages in critical paths (notably in `chatCompletion` and `FileSystemService`) weaken the benefits of TypeScript.
3.  **Testing Culture:** High "untested risk" in the services layer. Professional AI tools require high reliability; adding unit tests for the tool registry is a priority.

### Performance Bottlenecks
1.  **Re-render Cycles:** During streaming, the `AssistantBubble` often re-renders the entire markdown content. While `React.memo` is used, the `components` prop in `MarkdownMessage` should be memoized to prevent expensive re-parsing.
2.  **Context Contraction:** The `contractContext` step for model switching is excellent but should be audited to ensure it doesn't block the UI thread during large conversation summaries.

### Final Verdict
The foundation is extremely strong (Tauri + Go + React 19). By consolidating the dual-language tool logic and decomposing the large UI monoliths, the app would move from an "Average" (Grade C) health score to a "Professional-Grade" (Grade A) workstation.
