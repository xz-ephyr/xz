# Agent Framework & TypeScript Tools Inspection

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
