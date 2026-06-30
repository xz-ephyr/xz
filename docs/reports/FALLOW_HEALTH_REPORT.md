# npx fallow Detailed Health & Complexity Report
**Date:** June 2026
**Overall Health Score:** 88 (Grade: A)
**Total Lines of Code (LOC):** 11,612
**Average Maintainability Index (MI):** 92.4 (Good)

This report provides a comprehensive breakdown of technical debt, complexity hotspots, and refactoring priorities for the `xz` project.

---

## 1. Executive Summary
The project has seen a significant improvement in overall health, moving from a Grade C to a Grade A. This progress is largely due to the resolution of unused dependency deductions and improved maintainability across core modules. The current health score of **88** reflects a robust architecture, though the presence of several high-complexity "God Components" continues to be the primary area for future optimization.

---

## 2. Refactoring Targets (Prioritized)
The following 9 targets are prioritized based on their "Quick-Win ROI"—a combination of complexity, churn, and coupling signals.

| ROI | Priority | File | Issue | Effort |
| :--- | :--- | :--- | :--- | :--- |
| **10.0** | High | `src/lib/tauri/index.ts` | **High Impact**: 17 dependents amplify every change. Split file. | High |
| **9.4** | Med | `src/services/FileSystemService.ts` | **Complexity**: `getTree` (Cognitive: 34) is too dense for core utility. | Med |
| **8.8** | Med | `server/src/searchService.ts` | **Untested Risk**: 16 complex functions lack coverage; significant cloning. | Med |
| **8.7** | Med | `src/components/chat/AssistantBubble.tsx` | **Complexity**: Component (Cognitive: 42) is bloated with inline logic. | Med |
| **8.7** | Med | `src/pages/ChatsPage.tsx` | **Complexity**: Main listing page (Cognitive: 30) needs modularization. | Med |
| **7.6** | High | `src/pages/ChatPage.tsx` | **Complexity**: The core "God Component" (Cognitive: 57, 677 LOC). | High |
| **7.6** | Med | `src/lib/chatUtils.ts` | **Untested Risk**: 4 complex mapping functions lack test coverage. | Med |
| **5.9** | Med | `src/components/chat/ThinkingTimeline.tsx` | **Complexity**: Aggregated source logic (Cognitive: 92) is brittle. | Med |
| **4.8** | High | `src/components/settings/SettingsModal.tsx` | **Complexity**: (Cognitive: 60) Massively duplicated UI patterns. | High |

---

## 3. Complexity & CRAP Analysis
CRAP (Change Risk Anti-Patterns) identifies functions that are both complex and poorly tested.

### Top Complexity Hotspots:
*   **`src/components/chat/ThinkingTimeline.tsx`**:
    *   `useTimelineSteps` logic (Cognitive: 92): Orchestrates real-time reasoning updates; extremely high cognitive load.
*   **`src/pages/ChatPage.tsx`**:
    *   `ChatPage` (677 lines, Cognitive: 57): Handles session loading, streaming state, artifact coordination, and layout management.
*   **`src/components/settings/SettingsModal.tsx`**:
    *   `SettingsModal` (552 lines, Cognitive: 60): Contains a massive render block with nested ternaries and duplicated model selection logic.
*   **`src/services/FileSystemService.ts`**:
    *   `getTree` (Cognitive: 34): Manages recursive directory walking with caching and dual-mode (Tauri/Web) logic.

---

## 4. Duplication (6.0% Rate)
The project contains **21 Clone Families** across **28 Groups**, totaling **664 duplicated lines**.

### Notable Clones:
*   **Web Search Tools**: Significant logic duplication between `src/services/ai/tools/webSearchTool.ts` and various specialized search modules (webSearch, fetchPage, imageSearch, newsSearch).
*   **Git Tooling**: Shared execution patterns across `gitBranches`, `gitDiff`, `gitLog`, `gitShow`, and `gitStatus`.
*   **Model Setup Logic**: Duplicated between `src/components/onboarding/ModelSetupStep.tsx` and `src/components/settings/SettingsModal.tsx`.

---

## 5. Dead Code & Dependencies
*   **Unused Exports**: 1 issue (0.5% of total exports). `cleanupExpiredCache` in `server/src/searchService.ts` is currently unreferenced.
*   **Unused Dependencies**: 0 issues. The project is clean regarding unused packages in `package.json`.
*   **Unlisted Dependencies**: 1 package (`@codemirror/language`) is used in the source but missing from `package.json`.

---

## 6. Architectural Debt: The "Fan-In" Problem
High fan-in components amplify the risk of regressions when they are modified.
*   **`src/lib/tauri/index.ts`**: 17 dependents. This file acts as the primary bridge to the native shell; its massive impact on the dependency graph makes it a primary refactoring target.
*   **`<HugeiconRenderer>`**: 5 total imports. Centralized icon rendering is well-maintained but critical for UI consistency.
*   **`<CodeBlock>`**: 2 imports. Changes here affect every chat bubble and artifact view.

---

## 7. Conclusions & Mitigation Plan
To maintain the current **Grade A** and work towards a perfect score:
1.  **Split Tauri Bridge**: Implement the "High Impact" refactor of `src/lib/tauri/index.ts` to reduce its blast radius.
2.  **Unbloat ThinkingTimeline**: Break down the reasoning step orchestrator to reduce cognitive load from 92 to <15.
3.  **Address Unlisted Dependencies**: Add `@codemirror/language` to `package.json` to ensure build stability.
4.  **Deduplicate Search Tools**: Unify the logic between the AI tool registry and the core search services.
