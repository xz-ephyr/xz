# Future Feature Roadmap

This document outlines requested features for the project, sorted by implementation complexity and current status. These features are prioritized from the simplest tasks (often with foundational work already in place) to the most complex/architecturally significant tasks.

---

## 🟢 Phase 1: Foundational & Low Complexity
*Features that build on existing patterns or require minimal architectural changes.*

1. **Extensions & Plugins**
   - **Status**: Not started.
   - **Complexity**: Low. 
   - **Context**: Requires defining a schema for plugins to hook into the existing orchestrator.

2. **Web Searching (Deep/Enhanced)**
   - **Status**: Partially done (Tavily/Serper exists).
   - **Complexity**: Low.
   - **Context**: Expanding the existing `src/server/search` layer to support more advanced deep-search providers.

3. **Local Installed CLI Options**
   - **Status**: Partially done (Tauri sidecar exists).
   - **Complexity**: Low.
   - **Context**: Exposing more existing server-side functionality to a CLI interface via command-line arguments in the existing `src-tauri` structure.

---

## 🟡 Phase 2: Moderate Complexity
*Features requiring new service integration or UI/UX shifts.*

4. **Browser Use**
   - **Status**: Not started.
   - **Complexity**: Moderate.
   - **Context**: Requires integration of a headless browser (e.g., Playwright) and management of browser sessions within the agent graph.

5. **Remote Control (Social Chat Integration)**
   - **Status**: Not started.
   - **Complexity**: Moderate.
   - **Context**: Requires implementing webhooks for platforms like Slack/Telegram/Discord and integrating them into the existing `pubsub` and `queue` systems.

6. **Computer Use**
   - **Status**: Not started.
   - **Complexity**: Moderate.
   - **Context**: Requires secure handling of desktop interaction primitives, likely building on existing Tauri capabilities.

7. **Multi-Modal Models (Local/Remote)**
   - **Status**: Partially done (Claude integration).
   - **Complexity**: Moderate.
   - **Context**: Extending `src/server/llm` to support local model execution (e.g., Ollama) and additional Gemini family models.

---

## 🔴 Phase 3: High Complexity / Architectural Evolution
*Features requiring significant infrastructure, R&D, or external system development.*

8. **Professional Motion Graphics Design Plugin**
   - **Status**: Not started.
   - **Complexity**: High.
   - **Context**: Requires a new rendering engine or integration with external motion graphics tools, and a UI layer for visual editing.

9. **Deploy Parallel Agents**
   - **Status**: Partially done (Agent graph exists).
   - **Complexity**: High.
   - **Context**: Requires re-architecting the current orchestrator to support concurrent agent execution flows and complex state synchronization across workers.

10. **Skills (Extensibility Framework)**
    - **Status**: Not started.
    - **Complexity**: High.
    - **Context**: Requires a robust sandbox environment to allow agents to "learn" and execute new skills safely without compromising system security.

---

## 📋 Summary Table

| Feature | Complexity | Status |
| :--- | :--- | :--- |
| Plugins/Extensions | Low | Not started |
| Deep Web Searching | Low | Partially done |
| Local CLI Options | Low | Partially done |
| Browser Use | Moderate | Not started |
| Social Chat Integration | Moderate | Not started |
| Computer Use | Moderate | Not started |
| Multi-Modal Models | Moderate | Partially done |
| Motion Graphics Design | High | Not started |
| Parallel Agent Deployment | High | Partially done |
| Skills Framework | High | Not started |

*Note: This roadmap is a living document and subject to change based on project needs and architectural discovery.*
