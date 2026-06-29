# npx fallow Detailed Health & Complexity Report
**Date:** March 2025
**Overall Health Score:** 63 (Grade: C)
**Total Lines of Code (LOC):** 11,434
**Average Maintainability Index (MI):** 92.4 (Good)

This report provides a comprehensive breakdown of technical debt, complexity hotspots, and refactoring priorities for the `xz` project.

---

## 1. Executive Summary
The project maintains a solid average maintainability, but is held back by several high-risk "God Components" and significant logic duplication. The current health score of **63** reflects deductions primarily from unused dependencies (-25.0) and excessive unit sizes in the UI layer (-10.0).

---

## 2. Refactoring Targets (Prioritized)
The following 10 targets are prioritized based on their "Quick-Win ROI"—a combination of complexity, churn, and coupling signals.

| ROI | Priority | File | Issue | Effort |
| :--- | :--- | :--- | :--- | :--- |
| **10.7** | High | `src/services/tools/system/systemInfo.ts` | **Untested Risk**: 3 complex functions lack any test coverage. | Low |
| **10.0** | High | `src/lib/tauri.ts` | **High Impact**: 16 dependents amplify every change. Needs splitting. | High |
| **9.2** | Med | `src/services/FileSystemService.ts` | **Complexity**: `getTree` (Cognitive: 34) is too dense for a core utility. | Med |
| **8.7** | Med | `server/src/searchService.ts` | **Untested Risk**: 16 complex functions lack coverage; significant cloning. | Med |
| **8.4** | Med | `src/components/chat/AssistantBubble.tsx` | **Complexity**: Component (Cognitive: 42) is bloated with inline logic. | Med |
| **8.4** | Med | `src/pages/ChatsPage.tsx` | **Complexity**: Main listing page (Cognitive: 30) needs modularization. | Med |
| **7.6** | High | `src/pages/ChatPage.tsx` | **Complexity**: The core "God Component" (Cognitive: 57, 763 LOC). | High |
| **7.4** | Med | `src/lib/chatUtils.ts` | **Untested Risk**: 4 complex mapping functions lack test coverage. | Med |
| **5.9** | Med | `src/components/chat/ThinkingTimeline.tsx` | **Complexity**: Aggregated source logic (Cognitive: 92) is extremely brittle. | Med |
| **4.6** | High | `src/components/settings/SettingsModal.tsx` | **Complexity**: (Cognitive: 60) Massively duplicated UI patterns. | High |

---

## 3. Complexity & CRAP Analysis
CRAP (Change Risk Anti-Patterns) identifies functions that are both complex and poorly tested.

### Top Complexity Hotspots:
*   **`src/pages/ChatPage.tsx`**:
    *   `ChatPage` (639 lines): Handles session loading, streaming state, artifact coordination, and layout management.
    *   `loadSession` (Cognitive: 5): Brittle state transitions during initialization.
*   **`src/components/settings/SettingsModal.tsx`**:
    *   `SettingsModal` (552 lines): Contains a massive render block with nested ternaries and duplicated model selection logic.
*   **`src/components/chat/ThinkingTimeline.tsx`**:
    *   `useTimelineSteps` (142 lines): Orchestrates real-time reasoning updates; high cognitive load (92).
*   **`src/services/FileSystemService.ts`**:
    *   `getTree` (Cognitive: 34): Manages recursive directory walking with caching and dual-mode (Tauri/Web) logic.

---

## 4. Duplication (6.0% Rate)
The project contains **21 Clone Families** across **28 Groups**, totaling **664 duplicated lines**.

### Notable Clones:
*   **Model Setup Logic**: Duplicated between `src/components/onboarding/ModelSetupStep.tsx` and `src/components/settings/SettingsModal.tsx`.
*   **Search Utilities**: Significant duplication in `server/src/searchService.ts` for fetching and parsing results across different providers.
*   **VFS Walking**: Duplicated patterns in `src/services/FileSystemService.ts` for tree building and key extraction.

---

## 5. Dead Code & Dependencies
*   **Dead Exports**: 1 issue (0.5% of total exports). The project is generally clean regarding unreachable code.
*   **Unused Dependencies**: 10 packages in `package.json` are never imported. Removing these would reclaim the -25.0 health deduction.
*   **Unlisted Dependencies**: 3 packages are used in the source but missing from `package.json`.

---

## 6. Architectural Debt: The "Fan-In" Problem
High fan-in components amplify the risk of regressions when they are modified.
*   **`<HugeiconRenderer>`**: 34 total imports. This is the single most coupled component in the UI.
*   **`<CodeBlock>`**: 4 imports. Changes here affect every chat bubble and artifact view.
*   **`src/lib/tauri.ts`**: 16 dependents. This file acts as the primary bridge to the native shell; its size (4 LOC) belies its massive impact on the dependency graph.

---

## 7. Conclusions & Mitigation Plan
To improve the health score from **C to B+**, the following steps are mandatory:
1.  **Extract System Logic**: Refactor `systemInfo.ts` and add unit tests to address the #1 refactoring ROI.
2.  **Modularize ChatPage**: Break `ChatPage.tsx` into `ChatHeader`, `MessageList`, `InputArea`, and `ArtifactManager`.
3.  **Deduplicate Settings**: Centralize model provider configuration logic into a single reusable hook or component.
4.  **Prune Dependencies**: Run `pnpm prune` and remove the 10 unused packages identified by `fallow`.
