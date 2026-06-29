# npx fallow Detailed Health Report
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
